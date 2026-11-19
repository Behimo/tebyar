<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Models\Block;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\Alerts;
use App\Support\Present;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MessageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $viewer = $request->user();
        $hidden = Present::hiddenIds($viewer);
        $conversations = Conversation::query()
            ->where(fn ($q) => $q->where('user_one_id', $viewer->id)->orWhere('user_two_id', $viewer->id))
            ->when($hidden !== [], fn ($query) => $query->whereNotIn('user_one_id', $hidden)->whereNotIn('user_two_id', $hidden))
            ->with(['userOne', 'userTwo'])
            ->orderByDesc('last_message_at')
            ->get();

        return response()->json([
            'data' => $conversations->map(fn (Conversation $conversation) => Present::conversation($conversation, $viewer))->values(),
        ]);
    }

    public function open(Request $request): JsonResponse
    {
        $data = $request->validate(['user_id' => ['required', 'integer']]);
        $viewer = $request->user();
        $peer = User::query()->whereKey($data['user_id'])->where('account_status', 'verified')->firstOrFail();

        if ($peer->id === $viewer->id) {
            return response()->json(['message' => 'گفتگو با خودتان ممکن نیست.'], 422);
        }

        $blocked = Block::query()
            ->where(fn ($q) => $q->where('blocker_id', $viewer->id)->where('blocked_id', $peer->id))
            ->orWhere(fn ($q) => $q->where('blocker_id', $peer->id)->where('blocked_id', $viewer->id))
            ->exists();

        if ($blocked) {
            return response()->json(['message' => 'ارسال پیام ممکن نیست.'], 403);
        }

        if ($peer->privacy_dm === 'none') {
            return response()->json(['message' => 'این پزشک پیام مستقیم را بسته است.'], 403);
        }

        if ($peer->privacy_dm === 'following' && ! $peer->following()->where('users.id', $viewer->id)->exists()) {
            return response()->json(['message' => 'این پزشک فقط از دنبال‌شوندگان پیام می‌گیرد.'], 403);
        }

        $one = min($viewer->id, $peer->id);
        $two = max($viewer->id, $peer->id);
        $conversation = Conversation::query()->firstOrCreate([
            'user_one_id' => $one,
            'user_two_id' => $two,
        ]);
        $conversation->load(['userOne', 'userTwo']);

        return response()->json(['data' => Present::conversation($conversation, $viewer)]);
    }

    public function messages(Request $request, Conversation $conversation): JsonResponse
    {
        $this->guard($conversation, $request->user());
        $this->markRead($conversation, $request->user());
        $conversation->refresh();
        $messages = $conversation->messages()->oldest()->limit(200)->get();

        return response()->json([
            'data' => $messages->map(fn (Message $message) => Present::message($message, $conversation, $request->user()))->values(),
            'peer' => Present::user($conversation->peer($request->user()), $request->user()),
        ]);
    }

    public function store(Request $request, Conversation $conversation): JsonResponse
    {
        $this->guard($conversation, $request->user());
        $data = $request->validate([
            'body' => ['nullable', 'string', 'max:4000'],
            'attachment' => ['nullable', 'file', 'max:20480'],
        ]);

        if (empty($data['body']) && ! $request->hasFile('attachment')) {
            return response()->json(['message' => 'متن یا فایل لازم است.'], 422);
        }

        $path = null;
        $name = null;
        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $path = $file->store('chat', 'local');
            $name = $file->getClientOriginalName();
        }

        $message = $conversation->messages()->create([
            'sender_id' => $request->user()->id,
            'body' => $data['body'] ?? null,
            'attachment_path' => $path,
            'attachment_name' => $name,
        ]);
        $conversation->forceFill(['last_message_at' => now()])->save();
        $this->markRead($conversation, $request->user());

        $peer = $conversation->peer($request->user());
        Alerts::send($peer, 'message', 'پیام جدید', $request->user()->name.' برای شما پیام فرستاد.', '/messages/'.$conversation->id);

        try {
            broadcast(new MessageSent($message));
        } catch (\Throwable $exception) {
            report($exception);
        }

        $conversation->refresh();

        return response()->json(['data' => Present::message($message, $conversation, $request->user())], 201);
    }

    public function attachment(Request $request, Message $message): StreamedResponse
    {
        $conversation = $message->conversation;
        $this->guard($conversation, $request->user());
        abort_unless($message->attachment_path, 404);

        return Storage::disk('local')->download($message->attachment_path, $message->attachment_name);
    }

    private function guard(Conversation $conversation, User $user): void
    {
        abort_unless($conversation->involves($user), 403);
    }

    private function markRead(Conversation $conversation, User $user): void
    {
        $column = $conversation->user_one_id === $user->id ? 'user_one_read_at' : 'user_two_read_at';
        $conversation->forceFill([$column => now()])->save();
    }
}
