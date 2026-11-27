<?php

namespace Tests\Feature;

use App\Models\PostMedia;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MediaOptimizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_uploaded_post_images_are_compressed_to_webp(): void
    {
        Storage::fake('public');
        Sanctum::actingAs(User::factory()->create());

        $this->post('/api/v1/posts', [
            'body' => 'تصویر آزمایشی',
            'media' => [UploadedFile::fake()->image('large.jpg', 2000, 1200)],
        ], ['Accept' => 'application/json'])->assertCreated();

        $media = PostMedia::query()->firstOrFail();
        $this->assertStringEndsWith('.webp', $media->path);
        Storage::disk('public')->assertExists($media->path);

        $size = getimagesizefromstring(Storage::disk('public')->get($media->path));
        $this->assertIsArray($size);
        $this->assertSame(1440, $size[0]);
        $this->assertSame(864, $size[1]);
    }

    public function test_media_endpoint_serves_cached_width_derivative(): void
    {
        Storage::fake('public');
        $image = UploadedFile::fake()->image('legacy.jpg', 1800, 1200);
        Storage::disk('public')->put('posts/1/legacy.jpg', file_get_contents($image->getRealPath()));

        $response = $this->get('/api/v1/media/posts/1/legacy.jpg?width=240');
        $response->assertOk();
        $cacheControl = (string) $response->headers->get('Cache-Control');
        $this->assertStringContainsString('public', $cacheControl);
        $this->assertStringContainsString('max-age=31536000', $cacheControl);
        $this->assertStringContainsString('immutable', $cacheControl);
        $this->assertSame('image/webp', $response->headers->get('Content-Type'));

        $size = getimagesizefromstring($response->streamedContent());
        $this->assertIsArray($size);
        $this->assertLessThanOrEqual(240, $size[0]);

        $cached = Storage::disk('public')->allFiles('.media-cache/240');
        $this->assertCount(1, $cached);
    }
}
