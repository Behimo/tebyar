<?php

namespace App\Http\Controllers\Api;

use App\Events\ConversationUpdated;
use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Models\Block;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\Alerts;
use App\Support\Membership;
use App\Support\Present;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MessageController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $viewer = $request->user();
        $hidden = Present::hiddenIds($viewer);
        $conversations = Conversation::query()
            ->whereHas('participants', fn ($q) => $q->where('user_id', $viewer->id))
            ->with([
                'userOne',
                'userTwo',
                'participants.user',
                'messages' => fn ($q) => $q->latest()->limit(1),
            ])
            ->orderByDesc('last_message_at')
            ->get()
            ->filter(function (Conversation $conversation) use ($viewer, $hidden) {
                if ($conversation->isGroup()) {
                    return true;
                }

                $peerId = $conversation->user_one_id === $viewer->id
                    ? $conversation->user_two_id
                    : $conversation->user_one_id;

                return $peerId && ! in_array($peerId, $hidden, true);
            });

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
        $existing = Conversation::query()
            ->where('user_one_id', $one)
            ->where('user_two_id', $two)
            ->where('type', 'direct')
            ->first();

        if (! $existing || ! $existing->messages()->exists()) {
            Membership::assertQuota($viewer, 'conversations');
        }

        $conversation = $existing ?? Conversation::query()->create([
            'user_one_id' => $one,
            'user_two_id' => $two,
            'type' => 'direct',
            'last_message_at' => now(),
        ]);
        $conversation->ensureDirectParticipants();
        $conversation->load(['userOne', 'userTwo', 'participants.user']);

        return response()->json(['data' => Present::conversation($conversation, $viewer)]);
    }

    public function connections(Request $request): JsonResponse
    {
        $viewer = $request->user();
        $ids = $viewer->following()->pluck('users.id')
            ->merge($viewer->followers()->pluck('users.id'))
            ->unique()
            ->values();
        $term = trim($request->string('q')->toString());
        $people = User::query()
            ->whereIn('id', $ids)
            ->when($term !== '', function ($query) use ($term) {
                $like = '%'.$term.'%';
                $query->where(fn ($inner) => $inner->where('name', 'like', $like)->orWhere('slug', 'like', $like));
            })
            ->orderBy('name')
            ->limit(40)
            ->get();

        return response()->json([
            'data' => $people->map(fn (User $user) => Present::user($user, $viewer))->values(),
        ]);
    }

    public function storeGroup(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'user_ids' => ['required', 'array', 'min:1'],
            'user_ids.*' => ['integer', 'distinct'],
        ]);

        $viewer = $request->user();
        Membership::assertQuota($viewer, 'conversations');
        $memberIds = collect($data['user_ids'])->push($viewer->id)->unique()->values();

        $conversation = DB::transaction(function () use ($viewer, $data, $memberIds) {
            $conversation = Conversation::query()->create([
                'type' => 'group',
                'title' => $data['title'],
                'created_by' => $viewer->id,
                'last_message_at' => now(),
            ]);

            foreach ($memberIds as $userId) {
                $conversation->participants()->create([
                    'user_id' => $userId,
                    'role' => $userId === $viewer->id ? 'admin' : 'member',
                    'last_read_at' => $userId === $viewer->id ? now() : null,
                ]);
            }

            return $conversation;
        });

        $conversation->load(['participants.user']);

        return response()->json(['data' => Present::conversation($conversation, $viewer)], 201);
    }

    public function addMember(Request $request, Conversation $conversation): JsonResponse
    {
        $this->guard($conversation, $request->user());
        $this->assertAdmin($conversation, $request->user());
        abort_unless($conversation->isGroup(), 422);

        $data = $request->validate(['user_id' => ['required', 'integer']]);
        $user = User::query()->whereKey($data['user_id'])->where('account_status', 'verified')->firstOrFail();
        if ($conversation->participants()->where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'عضو قبلاً اضافه شده.'], 422);
        }

        $conversation->participants()->create([
            'user_id' => $user->id,
            'role' => 'member',
        ]);

        return response()->json(['message' => 'عضو اضافه شد.']);
    }

    public function removeMember(Request $request, Conversation $conversation, User $user): JsonResponse
    {
        $this->guard($conversation, $request->user());
        $this->assertAdmin($conversation, $request->user());
        abort_unless($conversation->isGroup(), 422);
        abort_if($user->id === $request->user()->id, 422, 'سازنده گروه را نمی‌توان از اینجا حذف کرد.');
        $conversation->participants()->where('user_id', $user->id)->delete();

        return response()->json(['message' => 'عضو حذف شد.']);
    }

    public function messages(Request $request, Conversation $conversation): JsonResponse
    {
        $this->guard($conversation, $request->user());
        $this->markRead($conversation, $request->user());
        $conversation->refresh();
        $messages = $conversation->messages()->with('sender')->oldest()->limit(200)->get();

        return response()->json([
            'data' => $messages->map(fn (Message $message) => Present::message($message, $conversation, $request->user()))->values(),
            'conversation' => Present::conversation($conversation->loadMissing(['userOne', 'userTwo', 'participants.user']), $request->user()),
            'peer' => $conversation->isGroup()
                ? null
                : Present::user($conversation->peer($request->user()), $request->user()),
        ]);
    }

    public function store(Request $request, Conversation $conversation): JsonResponse
    {
        $this->guard($conversation, $request->user());
        if (! $conversation->isGroup() && ! $conversation->messages()->exists()) {
            Membership::assertQuota($request->user(), 'conversations');
        }
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
        $payload = Present::message($message, $conversation, $request->user());
        $sender = $request->user();

        app()->terminating(function () use ($conversation, $message, $sender) {
            try {
                if ($conversation->isGroup()) {
                    $recipientIds = $conversation->participants()
                        ->where('user_id', '!=', $sender->id)
                        ->pluck('user_id');
                    foreach ($recipientIds as $recipientId) {
                        $recipient = User::query()->find($recipientId);
                        if ($recipient) {
                            Alerts::send($recipient, 'message', 'پیام گروهی', $sender->name.' در «'.$conversation->title.'» پیام فرستاد.', '/messages/'.$conversation->id);
                        }
                    }
                } else {
                    $peer = $conversation->peer($sender);
                    Alerts::send($peer, 'message', 'پیام جدید', $sender->name.' برای شما پیام فرستاد.', '/messages/'.$conversation->id);
                }
                broadcast(new MessageSent($message));
                broadcast(new ConversationUpdated($conversation, $conversation->participantIds()));
            } catch (\Throwable $exception) {
                report($exception);
            }
        });

        return response()->json(['data' => $payload], 201);
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

    private function assertAdmin(Conversation $conversation, User $user): void
    {
        $role = $conversation->participants()->where('user_id', $user->id)->value('role');
        abort_unless($role === 'admin' || $conversation->created_by === $user->id, 403, 'فقط سازنده گروه می‌تواند اعضا را تغییر دهد.');
    }

    private function markRead(Conversation $conversation, User $user): void
    {
        $conversation->participants()->where('user_id', $user->id)->update(['last_read_at' => now()]);

        if (! $conversation->isGroup()) {
            $column = $conversation->user_one_id === $user->id ? 'user_one_read_at' : 'user_two_read_at';
            $conversation->forceFill([$column => now()])->save();
        }
    }
}
