<?php

namespace App\Support;

use App\Models\Comment;
use App\Models\Conversation;
use App\Models\Topic;
use App\Models\TopicReply;
use App\Models\User;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class Membership
{
    public const PROFESSIONALS = ['general', 'specialist', 'resident', 'pharmacist', 'nurse', 'veterinarian'];

    public const RESTRICTED = ['student', 'intern', 'public'];

    public const MEMBERS = [
        'general', 'specialist', 'resident', 'pharmacist', 'nurse', 'veterinarian',
        'student', 'intern', 'public',
    ];

    public const LEARNERS = ['student', 'intern'];

    public const LICENSED = self::PROFESSIONALS;

    /** @var array<string, array{label: string, roles: array<int, string>}> */
    public const AUDIENCE_GROUPS = [
        'public' => ['label' => 'عموم مردم', 'roles' => ['public']],
        'student' => ['label' => 'دانشجویان', 'roles' => ['student', 'intern']],
        'physician' => ['label' => 'پزشکان', 'roles' => ['general', 'specialist']],
        'resident' => ['label' => 'دستیاران تخصصی', 'roles' => ['resident']],
        'pharmacist' => ['label' => 'داروسازان', 'roles' => ['pharmacist']],
        'nurse' => ['label' => 'پرستاران', 'roles' => ['nurse']],
        'veterinarian' => ['label' => 'دامپزشکان', 'roles' => ['veterinarian']],
    ];

    public const QUOTA_LABELS = [
        'posts' => 'پست فید',
        'stories' => 'استوری',
        'topics' => 'موضوع انجمن',
        'comments' => 'نظر و پاسخ',
        'conversations' => 'شروع گفتگو',
    ];

    public const RESTRICTED_DAILY_LABELS = [
        'topics' => 'سؤال انجمن',
        'comments' => 'نظر و پاسخ',
    ];

    public static function isLearner(User $user): bool
    {
        return in_array($user->role, self::LEARNERS, true);
    }

    public static function isLicensed(User $user): bool
    {
        return in_array($user->role, self::LICENSED, true) && $user->license_verified_at !== null;
    }

    public static function isProfessional(User $user): bool
    {
        return in_array($user->role, self::PROFESSIONALS, true);
    }

    public static function isRestricted(User $user): bool
    {
        return in_array($user->role, self::RESTRICTED, true);
    }

    public static function isActiveMember(User $user): bool
    {
        return $user->account_status === 'verified' && in_array($user->role, self::MEMBERS, true);
    }

    public static function isPro(User $user): bool
    {
        return $user->isPro();
    }

    public static function isQuotaExempt(User $user): bool
    {
        if (self::isRestricted($user)) {
            return $user->staff_role !== null || ! AppSettings::limitsEnabled();
        }

        return ! AppSettings::limitsEnabled()
            || self::isPro($user)
            || $user->staff_role !== null;
    }

    public static function canUseCommunity(User $user): bool
    {
        return self::isActiveMember($user);
    }

    public static function canPostSocial(User $user): bool
    {
        return $user->account_status === 'verified' && self::isProfessional($user);
    }

    public static function canAskQuestion(User $user): bool
    {
        return self::isActiveMember($user);
    }

    public static function canMessage(User $user): bool
    {
        return $user->account_status === 'verified' && self::isProfessional($user);
    }

    public static function canUseJobs(User $user): bool
    {
        return $user->account_status === 'verified' && self::isProfessional($user);
    }

    public static function canSubscribe(User $user): bool
    {
        return $user->account_status === 'verified' && self::isProfessional($user);
    }

    public static function canChooseAudience(User $user): bool
    {
        return self::isProfessional($user);
    }

    public static function canCreateCase(User $user): bool
    {
        return self::isLicensed($user) && $user->account_status === 'verified';
    }

    public static function canCreatePoll(User $user): bool
    {
        return self::canCreateCase($user);
    }

    public static function audienceGroupOf(User $user): ?string
    {
        foreach (self::AUDIENCE_GROUPS as $group => $config) {
            if (in_array($user->role, $config['roles'], true)) {
                return $group;
            }
        }

        return null;
    }

    /** @return array<int, array{key: string, label: string}> */
    public static function audienceGroupOptions(): array
    {
        return collect(self::AUDIENCE_GROUPS)
            ->map(fn (array $config, string $key) => ['key' => $key, 'label' => $config['label']])
            ->values()
            ->all();
    }

    /**
     * @param  array<int, string>|null  $input
     * @return array<int, string>|null
     */
    public static function normalizeAudience(User $author, mixed $input): ?array
    {
        if (! self::canChooseAudience($author)) {
            return null;
        }

        if ($input === null) {
            return null;
        }

        if (! is_array($input)) {
            throw ValidationException::withMessages(['audience' => 'مخاطب انتخاب‌شده معتبر نیست.']);
        }

        $keys = array_keys(self::AUDIENCE_GROUPS);
        $values = array_values(array_unique(array_map('strval', $input)));

        foreach ($values as $value) {
            if (! in_array($value, $keys, true)) {
                throw ValidationException::withMessages(['audience' => 'گروه مخاطب نامعتبر است.']);
            }
        }

        if ($values === []) {
            throw ValidationException::withMessages(['audience' => 'حداقل یک گروه مخاطب انتخاب کنید.']);
        }

        $values = array_values(array_intersect($keys, $values));

        if (count($values) === count($keys)) {
            return null;
        }

        return $values;
    }

    /**
     * @return array{
     *     limits_enabled: bool,
     *     is_exempt: bool,
     *     period: 'daily'|'lifetime',
     *     items: array<string, array{key: string, label: string, used: int, limit: ?int, remaining: ?int, exceeded: bool}>
     * }
     */
    public static function quotas(User $user): array
    {
        $limitsEnabled = AppSettings::limitsEnabled();
        $exempt = self::isQuotaExempt($user);

        if (self::isRestricted($user)) {
            $limits = config('tebyar.restricted_daily_quotas', []);
            $usage = self::restrictedDailyUsageCounts($user);
            $items = [];
            foreach (self::RESTRICTED_DAILY_LABELS as $key => $label) {
                $used = $usage[$key] ?? 0;
                $limit = $exempt ? null : (int) ($limits[$key] ?? 0);
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
                'period' => 'daily',
                'items' => $items,
            ];
        }

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
            'period' => 'lifetime',
            'items' => $items,
        ];
    }

    public static function assertQuota(User $user, string $key): void
    {
        if (self::isQuotaExempt($user)) {
            return;
        }

        if (self::isRestricted($user)) {
            if (! array_key_exists($key, self::RESTRICTED_DAILY_LABELS)) {
                return;
            }

            $item = self::quotas($user)['items'][$key] ?? null;

            if (! $item || ! $item['exceeded']) {
                return;
            }

            throw new HttpResponseException(response()->json([
                'message' => 'سقف روزانه «'.$item['label'].'» پر شده است. فردا دوباره تلاش کنید.',
                'code' => 'daily_limit',
                'quota' => [
                    'key' => $item['key'],
                    'label' => $item['label'],
                    'used' => $item['used'],
                    'limit' => $item['limit'],
                ],
            ], 429));
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

    /** @return array<string, int> */
    public static function restrictedDailyUsageCounts(User $user): array
    {
        $today = now()->startOfDay();

        return [
            'topics' => Topic::query()
                ->where('user_id', $user->id)
                ->where('created_at', '>=', $today)
                ->count(),
            'comments' => Comment::query()->where('user_id', $user->id)->where('created_at', '>=', $today)->count()
                + TopicReply::query()->where('user_id', $user->id)->where('created_at', '>=', $today)->count(),
        ];
    }
}
