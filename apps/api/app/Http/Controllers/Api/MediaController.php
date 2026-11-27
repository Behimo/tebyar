<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\MediaStore;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MediaController extends Controller
{
    public function show(Request $request, string $path): StreamedResponse
    {
        $path = str_replace('\\', '/', $path);
        abort_if($path === '' || str_contains($path, '..'), 404);
        abort_unless(Storage::disk('public')->exists($path), 404);

        $width = MediaStore::derivativeWidth((int) $request->query('width', 0));
        $servePath = MediaStore::optimizedPublicPath($path, $width) ?? $path;
        $response = Storage::disk('public')->response($servePath);
        $response->headers->set('Cache-Control', 'public, max-age=31536000, immutable');
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        return $response;
    }
}
