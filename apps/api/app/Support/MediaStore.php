<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class MediaStore
{
    private const WEBP_QUALITY = 82;

    private const MAX_SOURCE_PIXELS = 24_000_000;

    private const OPTIMIZABLE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];

    private const OPTIMIZABLE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

    private const DERIVATIVE_WIDTHS = [128, 240, 360, 480, 720, 1080, 1440];

    /**
     * فایل‌های عمومی زیر storage/app/public با پوشه‌های مجزا ذخیره می‌شوند:
     * stories/{userId}/ · posts/{userId}/ · avatars/{userId}/
     */
    public static function storePublic(UploadedFile $file, string $folder, ?int $userId = null): string
    {
        $prefix = $folder.'/'.($userId ?: 'common');
        $extension = strtolower($file->guessExtension() ?: $file->getClientOriginalExtension() ?: 'bin');
        $name = Str::uuid()->toString().'.'.$extension;
        $path = $file->storeAs($prefix, $name, 'public');

        if (! is_string($path) || $path === '') {
            throw new RuntimeException('ذخیره فایل رسانه ناموفق بود.');
        }

        if (! in_array(strtolower($file->getMimeType() ?? ''), self::OPTIMIZABLE_MIMES, true)) {
            return $path;
        }

        [$maxWidth, $maxHeight] = self::limitsForFolder($folder);

        try {
            return self::compressStoredImage($path, $maxWidth, $maxHeight) ?? $path;
        } catch (\Throwable) {
            return $path;
        }
    }

    public static function derivativeWidth(int $width): ?int
    {
        if ($width < 1) {
            return null;
        }

        foreach (self::DERIVATIVE_WIDTHS as $allowed) {
            if ($width <= $allowed) {
                return $allowed;
            }
        }

        return self::DERIVATIVE_WIDTHS[array_key_last(self::DERIVATIVE_WIDTHS)];
    }

    public static function optimizedPublicPath(string $path, ?int $width = null): ?string
    {
        if (! self::isOptimizablePath($path)) {
            return null;
        }

        $disk = Storage::disk('public');
        if (! $disk->exists($path)) {
            return null;
        }

        try {
            [$defaultWidth, $defaultHeight] = self::limitsForFolder(self::folderOf($path));
            $maxWidth = max(64, min($width ?? $defaultWidth, $defaultWidth));
            $maxHeight = max($maxWidth, (int) ceil($defaultHeight * ($maxWidth / $defaultWidth)));
            $target = '.media-cache/'.$maxWidth.'/'.sha1($path).'.webp';

            if ($disk->exists($target) && $disk->size($target) > 0 && $disk->lastModified($target) >= $disk->lastModified($path)) {
                return $target;
            }

            $original = $disk->get($path);
            $result = self::createWebp($original, $disk->path($path), $maxWidth, $maxHeight);
            if ($result === null) {
                return null;
            }

            $barelySmaller = strlen($result['binary']) >= (int) (strlen($original) * 0.95);
            if (! $result['resized'] && $barelySmaller) {
                return null;
            }

            $disk->put($target, $result['binary']);

            return $target;
        } catch (\Throwable) {
            return null;
        }
    }

    private static function compressStoredImage(string $path, int $maxWidth, int $maxHeight): ?string
    {
        $disk = Storage::disk('public');
        $original = $disk->get($path);
        $result = self::createWebp($original, $disk->path($path), $maxWidth, $maxHeight);

        if ($result === null) {
            return null;
        }

        $barelySmaller = strlen($result['binary']) >= (int) (strlen($original) * 0.95);
        if (! $result['resized'] && $barelySmaller) {
            return null;
        }

        $target = self::webpPath($path);
        $disk->put($target, $result['binary']);

        if ($target !== $path) {
            $disk->delete($path);
        }

        return $target;
    }

    /**
     * @return array{binary: string, width: int, height: int, resized: bool}|null
     */
    private static function createWebp(string $binary, string $absolutePath, int $maxWidth, int $maxHeight): ?array
    {
        $size = @getimagesizefromstring($binary);
        if (! is_array($size)) {
            return null;
        }

        $width = (int) ($size[0] ?? 0);
        $height = (int) ($size[1] ?? 0);
        if ($width < 1 || $height < 1 || ($width * $height) > self::MAX_SOURCE_PIXELS) {
            return null;
        }

        $source = @imagecreatefromstring($binary);
        if (! $source instanceof \GdImage) {
            return null;
        }

        $source = self::applyExifOrientation($source, $absolutePath);
        $width = imagesx($source);
        $height = imagesy($source);
        $scale = min($maxWidth / $width, $maxHeight / $height, 1);
        $targetWidth = max(1, (int) round($width * $scale));
        $targetHeight = max(1, (int) round($height * $scale));
        $canvas = imagecreatetruecolor($targetWidth, $targetHeight);

        if (! $canvas instanceof \GdImage) {
            imagedestroy($source);

            return null;
        }

        imagealphablending($canvas, false);
        imagesavealpha($canvas, true);
        $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
        if (is_int($transparent)) {
            imagefill($canvas, 0, 0, $transparent);
        }
        imagecopyresampled($canvas, $source, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);

        ob_start();
        $encoded = imagewebp($canvas, null, self::WEBP_QUALITY);
        $webp = ob_get_clean();
        imagedestroy($canvas);
        imagedestroy($source);

        if (! $encoded || ! is_string($webp) || $webp === '') {
            return null;
        }

        return [
            'binary' => $webp,
            'width' => $targetWidth,
            'height' => $targetHeight,
            'resized' => $targetWidth !== $width || $targetHeight !== $height,
        ];
    }

    private static function applyExifOrientation(\GdImage $image, string $absolutePath): \GdImage
    {
        $orientation = self::exifOrientation($absolutePath);

        if (in_array($orientation, [2, 5, 7], true)) {
            imageflip($image, IMG_FLIP_HORIZONTAL);
        }
        if ($orientation === 4) {
            imageflip($image, IMG_FLIP_VERTICAL);
        }

        return match ($orientation) {
            3 => self::rotateImage($image, 180),
            5, 6 => self::rotateImage($image, -90),
            7, 8 => self::rotateImage($image, 90),
            default => $image,
        };
    }

    private static function rotateImage(\GdImage $image, float $angle): \GdImage
    {
        $rotated = imagerotate($image, $angle, 0);
        if (! $rotated instanceof \GdImage) {
            return $image;
        }

        imagedestroy($image);

        return $rotated;
    }

    private static function exifOrientation(string $absolutePath): int
    {
        if (! function_exists('exif_read_data') || ! preg_match('/\.jpe?g$/i', $absolutePath)) {
            return 1;
        }

        $exif = @exif_read_data($absolutePath);

        return is_array($exif) ? (int) ($exif['Orientation'] ?? 1) : 1;
    }

    /** @return array{0: int, 1: int} */
    private static function limitsForFolder(string $folder): array
    {
        return match ($folder) {
            'stories' => [1080, 1920],
            'avatars' => [512, 512],
            default => [1440, 1440],
        };
    }

    private static function folderOf(string $path): string
    {
        return explode('/', trim($path, '/'))[0] ?? '';
    }

    private static function isOptimizablePath(string $path): bool
    {
        return in_array(strtolower(pathinfo($path, PATHINFO_EXTENSION)), self::OPTIMIZABLE_EXTENSIONS, true);
    }

    private static function webpPath(string $path): string
    {
        $directory = pathinfo($path, PATHINFO_DIRNAME);
        $filename = pathinfo($path, PATHINFO_FILENAME);
        $prefix = $directory === '.' || $directory === '' ? '' : $directory.'/';

        return $prefix.$filename.'.webp';
    }
}
