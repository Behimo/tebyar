<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Block;
use App\Models\Comment;
use App\Models\DeviceToken;
use App\Models\Hashtag;
use App\Models\Post;
use App\Models\Report;
use App\Models\SupportTicket;
use App\Models\Topic;
use App\Models\User;
use App\Models\Vacancy;
use App\Support\Membership;
use App\Support\Present;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InboxController extends Controller
{
    public function notifications(Request $request): JsonResponse
    {
        $items = $request->user()->notifications()->latest()->limit(50)->get();

        return response()->json([
            'data' => $items->map(fn ($item) => [
                'id' => $item->id,
                'type' => $item->data['type'] ?? 'info',
                'title' => $item->data['title'] ?? '',
                'body' => $item->data['body'] ?? '',
                'href' => $item->data['href'] ?? null,
                'read_at' => $item->read_at?->toIso8601String(),
                'created_at' => $item->created_at?->toIso8601String(),
            ])->values(),
        ]);
    }

    public function readNotifications(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['message' => 'اعلان‌ها خوانده شد.']);
    }

    public function search(Request $request): JsonResponse
    {
        $viewer = $request->user();
        $term = trim($request->string('q')->toString());
        $hidden = Present::hiddenIds($viewer);

        if ($term === '') {
            return response()->json(['doctors' => [], 'posts' => [], 'hashtags' => []]);
        }

        $like = '%'.$term.'%';
        $tag = mb_strtolower(ltrim($term, '#'));
        $doctors = User::query()
            ->where('account_status', 'verified')
            ->whereIn('role', Membership::MEMBERS)
            ->when($hidden !== [], fn ($query) => $query->whereNotIn('id', $hidden))
            ->where(fn ($q) => $q
                ->where('name', 'like', $like)
                ->orWhere('slug', 'like', $like)
                ->orWhere('specialty_title', 'like', $like)
                ->orWhere('city', 'like', $like))
            ->withCount(['followers', 'following', 'posts'])
            ->limit(20)
            ->get();

        $posts = Post::query()->visible()->visibleTo($viewer)
            ->when($hidden !== [], fn ($query) => $query->whereNotIn('user_id', $hidden))
            ->where(function ($q) use ($like, $tag) {
                $q->where('body', 'like', $like)
                    ->orWhereHas('hashtags', fn ($h) => $h->where('name', 'like', '%'.$tag.'%'))
                    ->orWhereHas('author', fn ($author) => $author->where('name', 'like', $like)->orWhere('slug', 'like', $like));
            })
            ->with(['author', 'media', 'hashtags'])
            ->withCount(['reactions', 'comments', 'reposts'])
            ->latest()
            ->limit(24)
            ->get();

        $hashtags = Hashtag::query()
            ->where('name', 'like', '%'.$tag.'%')
            ->orderBy('name')
            ->limit(12)
            ->pluck('name');

        return response()->json([
            'doctors' => $doctors->map(fn (User $user) => Present::user($user, $viewer))->values(),
            'posts' => $posts->map(fn (Post $post) => Present::post($post, $viewer))->values(),
            'hashtags' => $hashtags->values(),
        ]);
    }

    public function report(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['post', 'comment', 'topic', 'vacancy', 'user'])],
            'id' => ['required', 'integer'],
            'reason' => ['required', Rule::in(['spam', 'privacy', 'misleading', 'harassment', 'other'])],
            'details' => ['nullable', 'string', 'max:2000'],
        ]);

        $map = [
            'post' => Post::class,
            'comment' => Comment::class,
            'topic' => Topic::class,
            'vacancy' => Vacancy::class,
            'user' => User::class,
        ];
        $class = $map[$data['type']];
        abort_unless($class::query()->whereKey($data['id'])->exists(), 404);

        Report::query()->create([
            'reporter_id' => $request->user()->id,
            'reportable_type' => $class,
            'reportable_id' => $data['id'],
            'reason' => $data['reason'],
            'details' => $data['details'] ?? null,
        ]);

        return response()->json(['message' => 'گزارش ثبت شد و برای نظارت ارسال می‌شود.']);
    }

    public function blocks(Request $request): JsonResponse
    {
        $blocks = Block::query()->where('blocker_id', $request->user()->id)->with('blocked')->get();

        return response()->json([
            'data' => $blocks->map(fn (Block $block) => Present::user($block->blocked, $request->user()))->values(),
        ]);
    }

    public function block(Request $request): JsonResponse
    {
        $data = $request->validate(['user_id' => ['required', 'integer']]);
        abort_if((int) $data['user_id'] === $request->user()->id, 422);
        Block::query()->firstOrCreate([
            'blocker_id' => $request->user()->id,
            'blocked_id' => $data['user_id'],
        ]);
        $request->user()->following()->detach($data['user_id']);
        User::query()->find($data['user_id'])?->following()->detach($request->user()->id);

        return response()->json(['message' => 'کاربر مسدود شد.']);
    }

    public function unblock(Request $request, User $user): JsonResponse
    {
        Block::query()->where('blocker_id', $request->user()->id)->where('blocked_id', $user->id)->delete();

        return response()->json(['message' => 'مسدودیت برداشته شد.']);
    }

    public function tickets(Request $request): JsonResponse
    {
        $tickets = SupportTicket::query()
            ->where('user_id', $request->user()->id)
            ->with(['messages' => fn ($query) => $query->where('is_internal', false)])
            ->latest()
            ->get();

        return response()->json([
            'data' => $tickets->map(fn (SupportTicket $ticket) => [
                'id' => $ticket->id,
                'subject' => $ticket->subject,
                'status' => $ticket->status,
                'messages' => $ticket->messages->map(fn ($message) => [
                    'body' => $message->body,
                    'created_at' => $message->created_at?->toIso8601String(),
                ])->values(),
            ])->values(),
        ]);
    }

    public function storeTicket(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject' => ['required', 'string', 'max:160'],
            'body' => ['required', 'string', 'max:4000'],
        ]);

        $ticket = SupportTicket::query()->create([
            'user_id' => $request->user()->id,
            'subject' => $data['subject'],
            'status' => 'open',
        ]);
        $ticket->messages()->create([
            'user_id' => $request->user()->id,
            'body' => $data['body'],
        ]);

        return response()->json(['message' => 'درخواست پشتیبانی ثبت شد.', 'id' => $ticket->id], 201);
    }

    public function storeDevice(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:512'],
            'platform' => ['required', Rule::in(['android', 'web'])],
        ]);

        DeviceToken::query()->updateOrCreate(
            ['user_id' => $request->user()->id, 'token' => $data['token']],
            ['platform' => $data['platform']],
        );

        return response()->json(['message' => 'دستگاه ثبت شد.']);
    }
}
