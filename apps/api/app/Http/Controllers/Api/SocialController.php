<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bookmark;
use App\Models\Hashtag;
use App\Models\Post;
use App\Models\Story;
use App\Models\StoryView;
use App\Models\User;
use App\Services\Alerts;
use App\Services\ExploreRanker;
use App\Support\MediaStore;
use App\Support\Membership;
use App\Support\Present;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class SocialController extends Controller
{
    public function feed(Request $request): JsonResponse
    {
        $viewer = $request->user();
        $tab = $request->string('tab')->toString() ?: 'suggested';
        $hidden = Present::hiddenIds($viewer);
        $query = Post::query()->visible();
        if ($hidden !== []) {
            $query->whereNotIn('user_id', $hidden);
        }

        if ($tab === 'following') {
            $ids = $viewer->following()->pluck('users.id');
            $query->whereIn('posts.user_id', $ids->isEmpty() ? [0] : $ids);
        } else {
            $specialty = $viewer->specialty_title ?? '';
            $city = $viewer->city ?? '';
            $query->orderByRaw(
                '(select (case when specialty_title = ? then 6 else 0 end) + (case when city <> \'\' and city = ? then 3 else 0 end) from users where users.id = posts.user_id) desc',
                [$specialty, $city],
            )->orderByRaw('(select count(*) from reactions where reactions.post_id = posts.id) + (select count(*) from comments where comments.post_id = posts.id and comments.hidden_at is null) desc');
        }

        $posts = $query->with(['author', 'media', 'hashtags', 'original.author', 'original.media', 'original.hashtags'])
            ->withCount(['reactions', 'comments', 'reposts'])
            ->withViewerState($viewer)
            ->latest('posts.created_at')
            ->paginate(12);

        return response()->json([
            'data' => $posts->getCollection()->map(fn (Post $post) => Present::post($post, $viewer))->values(),
            'next_page' => $posts->nextPageUrl(),
        ]);
    }

    public function explore(Request $request, ExploreRanker $ranker): JsonResponse
    {
        $viewer = $request->user();
        $term = trim($request->string('q')->toString());

        if ($term !== '') {
            return app(InboxController::class)->search($request);
        }

        $page = max(1, (int) $request->integer('page', 1));
        $tag = $request->string('tag')->toString() ?: null;
        $ranked = $ranker->rank($viewer, $page, $tag, $request->url());

        return response()->json([
            'data' => $ranked['posts']->map(fn (Post $post) => Present::post($post, $viewer))->values(),
            'next_page' => $ranked['next_page'],
            'tags' => $ranked['tags'],
            'suggested' => $ranked['suggested']->map(fn (User $doctor) => Present::user($doctor, $viewer))->values(),
        ]);
    }

    public function show(Request $request, Post $post): JsonResponse
    {
        $this->visible($post, $request->user());
        $post->load(['author', 'media', 'hashtags', 'original.author', 'original.media', 'original.hashtags'])->loadCount(['reactions', 'comments', 'reposts']);

        return response()->json(['data' => Present::post($post, $request->user(), true)]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->assertCanPost($user);
        Membership::assertQuota($user, 'posts');

        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:4000'],
            'link_url' => ['nullable', 'url', 'max:500'],
            'link_title' => ['nullable', 'string', 'max:180'],
            'media' => ['nullable', 'array', 'max:6'],
            'media.*' => ['file', 'mimes:jpg,jpeg,png,webp,mp4,webm', 'max:51200'],
            'cover_index' => ['nullable', 'integer', 'min:0'],
        ]);

        if (empty($data['body']) && empty($data['link_url']) && ! $request->hasFile('media')) {
            throw ValidationException::withMessages(['body' => 'متن، تصویر یا لینک لازم است.']);
        }

        $type = 'text';
        if ($request->hasFile('media')) {
            $mime = $request->file('media')[0]->getMimeType() ?? '';
            $type = str_starts_with($mime, 'video') ? 'video' : 'image';
        } elseif (! empty($data['link_url'])) {
            $type = 'link';
        }

        $post = DB::transaction(function () use ($request, $user, $data, $type) {
            $post = $user->posts()->create([
                'type' => $type,
                'body' => $data['body'] ?? null,
                'link_url' => $data['link_url'] ?? null,
                'link_title' => $data['link_title'] ?? null,
            ]);

            $files = array_values($request->file('media', []));
            $cover = (int) ($data['cover_index'] ?? 0);
            if ($files !== [] && $cover > 0 && $cover < count($files)) {
                $picked = $files[$cover];
                unset($files[$cover]);
                array_unshift($files, $picked);
                $files = array_values($files);
            }

            foreach ($files as $index => $file) {
                $mime = $file->getMimeType() ?? '';
                $post->media()->create([
                    'path' => MediaStore::storePublic($file, 'posts', $user->id),
                    'kind' => str_starts_with($mime, 'video') ? 'video' : 'image',
                    'position' => $index,
                ]);
            }

            $this->syncTags($post, $data['body'] ?? '');

            return $post;
        });

        $post->load(['author', 'media', 'hashtags'])->loadCount(['reactions', 'comments', 'reposts']);

        return response()->json(['data' => Present::post($post, $user)], 201);
    }

    public function update(Request $request, Post $post): JsonResponse
    {
        abort_unless($post->user_id === $request->user()->id, 403);
        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:4000'],
            'link_url' => ['nullable', 'url', 'max:500'],
            'link_title' => ['nullable', 'string', 'max:180'],
        ]);
        $payload = [];
        if ($request->exists('body')) {
            $payload['body'] = $data['body'] ?? null;
        }
        if ($request->exists('link_url')) {
            $payload['link_url'] = $data['link_url'] ?? null;
        }
        if ($request->exists('link_title')) {
            $payload['link_title'] = $data['link_title'] ?? null;
        }
        $post->fill($payload)->save();
        $this->syncTags($post, $data['body'] ?? '');
        $post->load(['author', 'media', 'hashtags'])->loadCount(['reactions', 'comments', 'reposts']);

        return response()->json(['data' => Present::post($post, $request->user(), true)]);
    }

    public function destroy(Request $request, Post $post): JsonResponse
    {
        abort_unless($post->user_id === $request->user()->id, 403);
        $post->forceFill(['removed_at' => now(), 'hidden_at' => now()])->save();

        return response()->json(['message' => 'پست حذف شد.']);
    }

    public function react(Request $request, Post $post): JsonResponse
    {
        $this->visible($post, $request->user());
        $post->reactions()->firstOrCreate(['user_id' => $request->user()->id], ['type' => 'like']);
        if ($post->user_id !== $request->user()->id) {
            Alerts::send($post->author, 'like', 'واکنش جدید', $request->user()->name.' پست شما را پسندید.', '/posts/'.$post->id);
        }

        return response()->json(['data' => Present::post($post->fresh()->load(['author', 'media', 'hashtags'])->loadCount(['reactions', 'comments', 'reposts']), $request->user())]);
    }

    public function unreact(Request $request, Post $post): JsonResponse
    {
        $post->reactions()->where('user_id', $request->user()->id)->delete();

        return response()->json(['data' => Present::post($post->fresh()->load(['author', 'media', 'hashtags'])->loadCount(['reactions', 'comments', 'reposts']), $request->user())]);
    }

    public function comment(Request $request, Post $post): JsonResponse
    {
        $this->visible($post, $request->user());
        Membership::assertQuota($request->user(), 'comments');
        $data = $request->validate([
            'body' => ['required', 'string', 'max:2000'],
            'parent_id' => ['nullable', 'integer'],
        ]);

        if (! empty($data['parent_id'])) {
            $parent = $post->comments()->whereKey($data['parent_id'])->whereNull('parent_id')->first();
            if (! $parent) {
                throw ValidationException::withMessages(['parent_id' => 'نظر اصلی پیدا نشد.']);
            }
        }

        $comment = $post->comments()->create([
            'user_id' => $request->user()->id,
            'parent_id' => $data['parent_id'] ?? null,
            'body' => $data['body'],
        ]);

        if ($post->user_id !== $request->user()->id) {
            Alerts::send($post->author, 'comment', 'نظر جدید', $request->user()->name.' روی پست شما نظر گذاشت.', '/posts/'.$post->id);
        }

        $comment->load('author');

        return response()->json(['data' => Present::comment($comment, $request->user())], 201);
    }

    public function repost(Request $request, Post $post): JsonResponse
    {
        $this->visible($post, $request->user());
        $this->assertCanPost($request->user());
        $data = $request->validate(['body' => ['nullable', 'string', 'max:1000']]);
        $original = $post->repost_of_id ? $post->original : $post;

        $repost = $request->user()->posts()->create([
            'type' => 'repost',
            'body' => $data['body'] ?? null,
            'repost_of_id' => $original->id,
        ]);

        if ($original->user_id !== $request->user()->id) {
            Alerts::send($original->author, 'repost', 'بازنشر', $request->user()->name.' پست شما را بازنشر کرد.', '/posts/'.$repost->id);
        }

        $repost->load(['author', 'media', 'hashtags', 'original.author', 'original.media', 'original.hashtags'])->loadCount(['reactions', 'comments', 'reposts']);

        return response()->json(['data' => Present::post($repost, $request->user())], 201);
    }

    public function bookmark(Request $request, Post $post): JsonResponse
    {
        $this->visible($post, $request->user());
        $post->bookmarks()->firstOrCreate(['user_id' => $request->user()->id]);

        return response()->json(['message' => 'ذخیره شد.']);
    }

    public function unbookmark(Request $request, Post $post): JsonResponse
    {
        $post->bookmarks()->where('user_id', $request->user()->id)->delete();

        return response()->json(['message' => 'از ذخیره‌ها خارج شد.']);
    }

    public function bookmarks(Request $request): JsonResponse
    {
        $viewer = $request->user();
        $posts = Post::query()->visible()
            ->whereIn('posts.id', Bookmark::query()->where('user_id', $viewer->id)->pluck('post_id'))
            ->with(['author', 'media', 'hashtags'])
            ->withCount(['reactions', 'comments', 'reposts'])
            ->withViewerState($viewer)
            ->latest('posts.created_at')
            ->get();

        return response()->json(['data' => $posts->map(fn (Post $post) => Present::post($post, $viewer))->values()]);
    }

    public function stories(Request $request): JsonResponse
    {
        $viewer = $request->user();
        $hidden = Present::hiddenIds($viewer);
        $stories = Story::query()
            ->where('expires_at', '>', now())
            ->when($hidden !== [], fn ($query) => $query->whereNotIn('user_id', $hidden))
            ->with('author')
            ->withExists(['views as seen' => fn ($query) => $query->where('user_id', $viewer->id)])
            ->latest()
            ->limit(80)
            ->get();

        return response()->json(['data' => $stories->map(fn (Story $story) => Present::story($story, $viewer))->values()]);
    }

    public function storeStory(Request $request): JsonResponse
    {
        $this->assertCanPost($request->user());
        Membership::assertQuota($request->user(), 'stories');
        $request->validate([
            'media' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,heic,heif', 'max:12288'],
        ]);

        $story = $request->user()->stories()->create([
            'path' => MediaStore::storePublic($request->file('media'), 'stories', $request->user()->id),
            'expires_at' => now()->addHours(config('tebyar.story_hours')),
        ]);
        $story->load('author');

        return response()->json(['data' => Present::story($story, $request->user())], 201);
    }

    public function destroyStory(Request $request, Story $story): JsonResponse
    {
        abort_unless($story->user_id === $request->user()->id, 403);
        $path = $story->path;
        $story->delete();
        try {
            Storage::disk('public')->delete($path);
        } catch (\Throwable) {
        }

        return response()->json(['message' => 'استوری حذف شد.']);
    }

    public function viewStory(Request $request, Story $story): JsonResponse
    {
        abort_if($story->expires_at->isPast(), 404);
        StoryView::query()->updateOrCreate(
            ['story_id' => $story->id, 'user_id' => $request->user()->id],
            ['viewed_at' => now()],
        );

        return response()->json(['data' => Present::story($story->load('author'), $request->user())]);
    }

    private function assertCanPost(User $user): void
    {
        if (! Membership::canPostSocial($user)) {
            abort(403, 'انتشار محتوا برای این حساب فعال نیست.');
        }

        if (Membership::isLearner($user)) {
            $count = $user->posts()->where('created_at', '>=', now()->startOfDay())->count();
            if ($count >= (int) config('tebyar.student_daily_posts')) {
                throw ValidationException::withMessages([
                    'body' => 'سقف انتشار امروز برای حساب دانشجویی پر شده است.',
                ]);
            }
        }
    }

    private function visible(Post $post, User $viewer): void
    {
        if ($post->hidden_at || $post->removed_at || in_array($post->user_id, Present::hiddenIds($viewer), true)) {
            abort(404);
        }
    }

    private function syncTags(Post $post, string $body): void
    {
        preg_match_all('/#([\p{L}\p{N}_]+)/u', $body, $matches);
        $ids = collect($matches[1] ?? [])->map(fn ($name) => mb_strtolower($name))->unique()->map(function ($name) {
            return Hashtag::query()->firstOrCreate(['name' => $name])->id;
        });
        $post->hashtags()->sync($ids->all());
    }
}
