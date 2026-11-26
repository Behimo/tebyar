<?php

namespace App\Support;

use App\Models\Block;
use App\Models\Comment;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\PollOption;
use App\Models\Post;
use App\Models\SavedVacancy;
use App\Models\Story;
use App\Models\Topic;
use App\Models\TopicReply;
use App\Models\User;
use App\Models\Vacancy;

class Present
{
    public static function user(User $user, ?User $viewer = null, bool $detail = false): array
    {
        $card = [
            'id' => $user->id,
            'name' => $user->name,
            'slug' => $user->slug,
            'role' => $user->role,
            'role_label' => $user->roleLabel(),
            'specialty_title' => $user->specialty_title,
            'headline' => $user->headline,
            'bio' => $detail ? $user->bio : null,
            'city' => $user->city,
            'avatar_url' => self::publicUrl($user->avatar_path),
            'badges' => [
                'education' => (bool) $user->education_verified_at,
                'identity' => (bool) $user->identity_verified_at,
                'license' => (bool) $user->license_verified_at,
                'specialty' => (bool) $user->specialty_verified_at,
            ],
            'followers_count' => $detail ? ($user->followers_count ?? $user->followers()->count()) : 0,
            'following_count' => $detail ? ($user->following_count ?? $user->following()->count()) : 0,
            'posts_count' => $detail ? ($user->posts_count ?? $user->posts()->visible()->count()) : 0,
            'is_following' => $detail && $viewer ? $viewer->following()->where('users.id', $user->id)->exists() : false,
            'is_self' => $viewer?->id === $user->id,
            'is_demo' => (bool) $user->is_demo,
            'is_pro' => Membership::isPro($user),
            'open_to_work' => (bool) $user->open_to_work,
            'anonymous' => false,
        ];

        if ($detail) {
            $card['entries'] = $user->entries()->latest()->get()->map(fn ($entry) => [
                'id' => $entry->id,
                'kind' => $entry->kind,
                'title' => $entry->title,
                'subtitle' => $entry->subtitle,
                'body' => $entry->body,
                'year' => $entry->year,
            ])->values();
        }

        return $card;
    }

    public static function me(User $user): array
    {
        $latest = $user->verificationRequests()->latest()->first();
        $card = self::user($user, $user, true);
        $card['phone'] = $user->phone;
        $card['account_status'] = $user->account_status;
        $card['status_label'] = $user->statusLabel();
        $card['staff_role'] = $user->staff_role;
        $card['privacy_dm'] = $user->privacy_dm;
        $card['privacy_mentions'] = $user->privacy_mentions ?? 'everyone';
        $card['show_read_receipts'] = (bool) ($user->show_read_receipts ?? true);
        $card['open_to_work'] = (bool) $user->open_to_work;
        $card['notify_interactions'] = $user->notify_interactions;
        $card['notify_messages'] = $user->notify_messages;
        $card['bio'] = $user->bio;
        $card['can_create_case'] = Membership::canCreateCase($user);
        $card['can_create_poll'] = Membership::canCreatePoll($user);
        $card['is_pro'] = Membership::isPro($user);
        $card['pro_until'] = $user->pro_until?->toIso8601String();
        $card['quotas'] = Membership::quotas($user);
        $card['verification'] = $latest ? [
            'type' => $latest->type,
            'status' => $latest->status,
            'note' => $latest->note,
        ] : null;
        $org = $user->organization;
        $card['organization'] = $org ? [
            'id' => $org->id,
            'name' => $org->name,
            'type' => $org->type,
            'type_label' => $org->typeLabel(),
            'city' => $org->city,
            'about' => $org->about,
            'status' => $org->status,
        ] : null;

        return $card;
    }

    public static function anonymousAuthor(): array
    {
        return [
            'id' => null,
            'name' => 'پزشک تأییدشده',
            'slug' => null,
            'role' => null,
            'role_label' => 'عضو تأییدشده',
            'specialty_title' => null,
            'headline' => null,
            'bio' => null,
            'city' => null,
            'avatar_url' => null,
            'badges' => ['education' => false, 'identity' => true, 'license' => true, 'specialty' => false],
            'followers_count' => 0,
            'following_count' => 0,
            'posts_count' => 0,
            'is_following' => false,
            'is_self' => false,
            'is_demo' => false,
            'anonymous' => true,
        ];
    }

    public static function post(Post $post, User $viewer, bool $withComments = false): array
    {
        $original = null;
        if ($post->relationLoaded('original') && $post->original) {
            $original = self::post($post->original, $viewer);
        }

        $card = [
            'id' => $post->id,
            'type' => $post->type,
            'body' => $post->body,
            'link_url' => $post->link_url,
            'link_title' => $post->link_title,
            'hashtags' => $post->hashtags->pluck('name')->values(),
            'media' => $post->media->map(fn ($media) => [
                'url' => self::publicUrl($media->path),
                'kind' => $media->kind,
            ])->values(),
            'reactions_count' => $post->reactions_count ?? $post->reactions()->count(),
            'comments_count' => $post->comments_count ?? $post->comments()->whereNull('hidden_at')->count(),
            'reposts_count' => $post->reposts_count ?? $post->reposts()->visible()->count(),
            'reacted' => $post->offsetExists('reacted')
                ? (bool) $post->getAttribute('reacted')
                : $post->reactions()->where('user_id', $viewer->id)->exists(),
            'bookmarked' => $post->offsetExists('bookmarked')
                ? (bool) $post->getAttribute('bookmarked')
                : $post->bookmarks()->where('user_id', $viewer->id)->exists(),
            'is_demo' => (bool) $post->is_demo,
            'created_at' => $post->created_at?->toIso8601String(),
            'author' => self::user($post->author, $viewer),
            'repost_of' => $original,
        ];

        if ($withComments) {
            $card['comments'] = $post->comments()
                ->whereNull('parent_id')
                ->whereNull('hidden_at')
                ->with(['author', 'replies' => fn ($q) => $q->whereNull('hidden_at')->with('author')])
                ->oldest()
                ->get()
                ->map(fn (Comment $comment) => self::comment($comment, $viewer))
                ->values();
        }

        return $card;
    }

    public static function comment(Comment $comment, User $viewer): array
    {
        return [
            'id' => $comment->id,
            'body' => $comment->body,
            'created_at' => $comment->created_at?->toIso8601String(),
            'author' => self::user($comment->author, $viewer),
            'replies' => $comment->relationLoaded('replies')
                ? $comment->replies->map(fn (Comment $reply) => [
                    'id' => $reply->id,
                    'body' => $reply->body,
                    'created_at' => $reply->created_at?->toIso8601String(),
                    'author' => self::user($reply->author, $viewer),
                ])->values()
                : [],
        ];
    }

    public static function story(Story $story, User $viewer): array
    {
        return [
            'id' => $story->id,
            'media_url' => self::publicUrl($story->path),
            'expires_at' => $story->expires_at?->toIso8601String(),
            'seen' => $story->offsetExists('seen')
                ? (bool) $story->getAttribute('seen')
                : $story->views()->where('user_id', $viewer->id)->exists(),
            'mine' => $story->user_id === $viewer->id,
            'author' => self::user($story->author, $viewer),
        ];
    }

    public static function topic(Topic $topic, User $viewer): array
    {
        $mask = $topic->anonymous && $topic->user_id !== $viewer->id;
        $options = $topic->options()->withCount('votes')->orderBy('position')->get();
        $total = $options->sum('votes_count');
        $vote = $topic->votes()->where('user_id', $viewer->id)->first();

        return [
            'id' => $topic->id,
            'kind' => $topic->kind,
            'title' => $topic->title,
            'body' => $topic->body,
            'anonymous' => $topic->anonymous,
            'is_demo' => (bool) $topic->is_demo,
            'created_at' => $topic->created_at?->toIso8601String(),
            'author' => $mask ? self::anonymousAuthor() : self::user($topic->author, $viewer),
            'reply_count' => $topic->replies()->whereNull('hidden_at')->count(),
            'disclaimer' => in_array($topic->kind, ['case', 'poll'], true)
                ? 'این محتوا توصیه درمانی یا اجماع علمی نیست و فقط برای گفت‌وگوی همکاران است.'
                : null,
            'community' => [
                'slug' => $topic->community->slug,
                'name' => $topic->community->name,
            ],
            'poll' => $topic->kind === 'poll' ? [
                'total' => $total,
                'voted_option_id' => $vote?->poll_option_id,
                'options' => $options->map(fn (PollOption $option) => [
                    'id' => $option->id,
                    'label' => $option->label,
                    'votes' => $option->votes_count,
                    'percent' => $total > 0 ? (int) round(($option->votes_count / $total) * 100) : 0,
                ])->values(),
            ] : null,
        ];
    }

    public static function reply(TopicReply $reply, User $viewer): array
    {
        return [
            'id' => $reply->id,
            'parent_id' => $reply->parent_id,
            'body' => $reply->body,
            'created_at' => $reply->created_at?->toIso8601String(),
            'author' => self::user($reply->author, $viewer),
            'replies' => $reply->relationLoaded('replies')
                ? $reply->replies->map(fn (TopicReply $child) => [
                    'id' => $child->id,
                    'parent_id' => $child->parent_id,
                    'body' => $child->body,
                    'created_at' => $child->created_at?->toIso8601String(),
                    'author' => self::user($child->author, $viewer),
                ])->values()
                : [],
        ];
    }

    public static function conversation(Conversation $conversation, User $viewer): array
    {
        $last = $conversation->relationLoaded('messages') && $conversation->messages->isNotEmpty()
            ? $conversation->messages->first()
            : $conversation->messages()->latest()->first();

        $participant = $conversation->participants->firstWhere('user_id', $viewer->id)
            ?? $conversation->participants()->where('user_id', $viewer->id)->first();

        $myRead = $participant?->last_read_at;
        if (! $conversation->isGroup()) {
            $legacy = $conversation->user_one_id === $viewer->id
                ? $conversation->user_one_read_at
                : $conversation->user_two_read_at;
            $myRead = $myRead ?? $legacy;
        }

        $unread = $last
            && $last->sender_id !== $viewer->id
            && (! $myRead || $last->created_at->gt($myRead));

        $members = [];
        if ($conversation->isGroup()) {
            $rows = $conversation->relationLoaded('participants')
                ? $conversation->participants
                : $conversation->participants()->with('user')->get();
            $members = $rows->map(fn ($row) => self::user($row->user, $viewer))->values()->all();
        }

        $peer = $conversation->isGroup()
            ? [
                'id' => null,
                'name' => $conversation->title ?? 'گروه',
                'slug' => null,
                'role' => null,
                'role_label' => '',
                'specialty_title' => null,
                'headline' => null,
                'bio' => null,
                'city' => null,
                'avatar_url' => null,
                'badges' => ['education' => false, 'identity' => false, 'license' => false, 'specialty' => false],
                'followers_count' => 0,
                'following_count' => 0,
                'posts_count' => 0,
                'is_following' => false,
                'is_self' => false,
                'is_demo' => false,
                'anonymous' => false,
            ]
            : self::user($conversation->peer($viewer), $viewer);

        return [
            'id' => $conversation->id,
            'type' => $conversation->isGroup() ? 'group' : 'direct',
            'title' => $conversation->title,
            'peer' => $peer,
            'members' => $members,
            'am_admin' => ($participant?->role === 'admin') || $conversation->created_by === $viewer->id,
            'unread' => $unread,
            'last_message' => $last ? [
                'body' => $last->body ?: ($last->attachment_path ? 'پیوست' : ''),
                'created_at' => $last->created_at?->toIso8601String(),
                'mine' => $last->sender_id === $viewer->id,
            ] : null,
        ];
    }

    public static function message(Message $message, Conversation $conversation, User $viewer): array
    {
        $message->loadMissing('sender');
        $read = false;
        if ($message->sender_id === $viewer->id) {
            if ($conversation->isGroup()) {
                $others = $conversation->participants()->where('user_id', '!=', $viewer->id)->get();
                $read = $others->isNotEmpty() && $others->every(
                    fn ($row) => $row->last_read_at && $message->created_at->lte($row->last_read_at)
                );
            } else {
                $peer = $conversation->peer($viewer);
                $peerRead = $message->sender_id === $conversation->user_one_id
                    ? $conversation->user_two_read_at
                    : $conversation->user_one_read_at;
                $read = ($peer->show_read_receipts ?? true)
                    && ($viewer->show_read_receipts ?? true)
                    && (bool) ($peerRead && $message->created_at->lte($peerRead));
            }
        }

        return [
            'id' => $message->id,
            'body' => $message->body,
            'sender_id' => $message->sender_id,
            'sender_name' => $conversation->isGroup() ? $message->sender->name : null,
            'attachment_url' => $message->attachment_path ? url('/api/v1/messages/'.$message->id.'/attachment') : null,
            'attachment_name' => $message->attachment_name,
            'mine' => $message->sender_id === $viewer->id,
            'read' => $read,
            'created_at' => $message->created_at?->toIso8601String(),
        ];
    }

    public static function vacancy(Vacancy $vacancy, ?User $viewer = null): array
    {
        $org = $vacancy->organization;

        return [
            'id' => $vacancy->id,
            'title' => $vacancy->title,
            'specialty' => $vacancy->specialty,
            'city' => $vacancy->city,
            'employment_type' => $vacancy->employment_type,
            'employment_label' => $vacancy->employmentLabel(),
            'description' => $vacancy->description,
            'created_at' => $vacancy->created_at?->toIso8601String(),
            'saved' => $viewer ? SavedVacancy::query()->where('user_id', $viewer->id)->where('vacancy_id', $vacancy->id)->exists() : false,
            'applied' => $viewer ? $vacancy->applications()->where('user_id', $viewer->id)->exists() : false,
            'organization' => [
                'name' => $org->name,
                'type' => $org->type,
                'type_label' => $org->typeLabel(),
                'city' => $org->city,
                'about' => $org->about,
            ],
        ];
    }

    /** @var array<int, array<int, int>> */
    private static array $hiddenCache = [];

    public static function hiddenIds(User $viewer): array
    {
        if (isset(self::$hiddenCache[$viewer->id])) {
            return self::$hiddenCache[$viewer->id];
        }

        return self::$hiddenCache[$viewer->id] = Block::query()
            ->where('blocker_id', $viewer->id)
            ->orWhere('blocked_id', $viewer->id)
            ->get(['blocker_id', 'blocked_id'])
            ->flatMap(fn (Block $block) => [$block->blocker_id, $block->blocked_id])
            ->reject(fn ($id) => (int) $id === $viewer->id)
            ->unique()
            ->values()
            ->all();
    }

    public static function publicUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        $relative = '/api/v1/media/'.ltrim($path, '/');
        $configured = config('tebyar.asset_url');
        if ($configured) {
            return rtrim($configured, '/').$relative;
        }

        return $relative;
    }
}
