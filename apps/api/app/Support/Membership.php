<?php

namespace App\Support;

use App\Models\Comment;
use App\Models\Conversation;
use App\Models\TopicReply;
use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;

class Membership
{
    public const LEARNERS = ['student', 'intern'];

    public const LICENSED = ['resident', 'general', 'specialist'];

    public const MEDICAL = ['student', 'intern', 'resident', 'general', 'specialist'];

    public const QUOTA_LABELS = [
        'posts' => 'پست فید',
        'stories' => 'استوری',
        'topics' => 'موضوع انجمن',
        'comments' => 'نظر و پاسخ',
        'conversations' => 'شروع گفتگو',
    ];

    public static function isLearner(User $user): bool
    {
        return in_array($user->role, self::LEARNERS, true);
    }

    public static function isLicensed(User $user): bool
    {
        return in_array($user->role, self::LICENSED, true) && $user->license_verified_at !== null;
    }

    public static function isPro(User $user): bool
    {
        return $user->isPro();
    }

    public static function isQuotaExempt(User $user): bool
    {
        return ! AppSettings::limitsEnabled()
            || self::isPro($user)
            || $user->staff_role !== null;
    }

    public static function canUseCommunity(User $user): bool
    {
        return $user->account_status === 'verified' && in_array($user->role, self::MEDICAL, true);
    }

    public static function canPostSocial(User $user): bool
    {
        return self::canUseCommunity($user);
    }

    public static function canCreateCase(User $user): bool
    {
        return self::isLicensed($user) && $user->account_status === 'verified';
    }

    public static function canCreatePoll(User $user): bool
    {
        return self::canCreateCase($user);
    }

    /**
     * @return array{
     *     limits_enabled: bool,
     *     is_exempt: bool,
     *     items: array<string, array{key: string, label: string, used: int, limit: ?int, remaining: ?int, exceeded: bool}>
     * }
     */
    public static function quotas(User $user): array
    {
        $limitsEnabled = AppSettings::limitsEnabled();
        $exempt = self::isQuotaExempt($user);
        $limits = AppSettings::freeQuotas();
        $usage = self::usageCounts($user);

        $items = [];
        foreach (self::QUOTA_LABELS as $key => $label) {
            $used = $usage[$key] ?? 0;
            $limit = $exempt ? null : ($limits[$key] ?? 0);
            $remaining = $limit === null ? null : max(0, $limit - $used);
            $exceeded = $limit !== null && $used >= $limit;

            $items[$key] = [
                'key' => $key,
                'label' => $label,
                'used' => $used,
                'limit' => $limit,
                'remaining' => $remaining,
                'exceeded' => $exceeded,
            ];
        }

        return [
            'limits_enabled' => $limitsEnabled,
            'is_exempt' => $exempt,
            'items' => $items,
        ];
    }

    public static function assertQuota(User $user, string $key): void
    {
        if (self::isQuotaExempt($user)) {
            return;
        }

        $quotas = self::quotas($user);
        $item = $quotas['items'][$key] ?? null;

        if (! $item || ! $item['exceeded']) {
            return;
        }

        throw new HttpResponseException(response()->json([
            'message' => 'سقف رایگان «'.$item['label'].'» پر شده است. برای ادامه، اشتراک طبیار پرو را فعال کنید.',
            'code' => 'upgrade_required',
            'quota' => [
                'key' => $item['key'],
                'label' => $item['label'],
                'used' => $item['used'],
                'limit' => $item['limit'],
            ],
        ], 402));
    }

    /** @return array<string, int> */
    public static function usageCounts(User $user): array
    {
        $posts = $user->posts()->where('type', '!=', 'repost')->count();
        $stories = $user->stories()->withTrashed()->count();
        $topics = $user->topics()->count();
        $comments = Comment::query()->where('user_id', $user->id)->count()
            + TopicReply::query()->where('user_id', $user->id)->count();

        $directStarted = DB::table('conversations as c')
            ->where('c.type', 'direct')
            ->whereRaw('(select m.sender_id from messages as m where m.conversation_id = c.id order by m.id asc limit 1) = ?', [$user->id])
            ->count();

        $groupsCreated = Conversation::query()
            ->where('type', 'group')
            ->where('created_by', $user->id)
            ->count();

        return [
            'posts' => $posts,
            'stories' => $stories,
            'topics' => $topics,
            'comments' => $comments,
            'conversations' => $directStarted + $groupsCreated,
        ];
    }
}
