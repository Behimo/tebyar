<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaStore
{
    /**
     * فایل‌های عمومی زیر storage/app/public با پوشه‌های مجزا ذخیره می‌شوند:
     * stories/{userId}/ · posts/{userId}/ · avatars/{userId}/
     */
    public static function storePublic(UploadedFile $file, string $folder, ?int $userId = null): string
    {
        $prefix = $folder.'/'.($userId ?: 'common');
        $name = Str::uuid()->toString().'.'.$file->guessExtension();

        return $file->storeAs($prefix, $name, 'public');
    }
}