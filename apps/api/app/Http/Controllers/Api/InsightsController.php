<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Post;
use App\Services\InsightsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InsightsController extends Controller
{
    public function impressions(Request $request, InsightsService $service): JsonResponse
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.post_id' => ['required', 'integer'],
            'items.*.source' => ['required', Rule::in(['feed', 'explore', 'profile', 'detail'])],
        ]);

        $service->recordImpressions($request->user(), $data['items']);

        return response()->json(['ok' => true]);
    }

    public function overview(Request $request, InsightsService $service): JsonResponse
    {
        $range = (int) $request->integer('range', 7);

        return response()->json([
            'data' => $service->overview($request->user(), $range),
        ]);
    }

    public function post(Request $request, Post $post, InsightsService $service): JsonResponse
    {
        return response()->json([
            'data' => $service->postInsights($request->user(), $post),
        ]);
    }
}
