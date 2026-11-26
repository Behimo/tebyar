<?php

namespace App\Services;

use App\Filament\Labels;
use App\Models\Bookmark;
use App\Models\Comment;
use App\Models\PollVote;
use App\Models\Post;
use App\Models\PostView;
use App\Models\ProfileView;
use App\Models\Reaction;
use App\Models\Story;
use App\Models\StoryView;
use App\Models\Topic;
use App\Models\TopicReply;
use App\Models\User;
use App\Support\Membership;
use App\Support\Present;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;

class InsightsService
{
    private const SOURCE_LABELS = [
        'feed' => 'فید خانه',
        'explore' => 'اکسپلور',
        'profile' => 'پروفایل',
        'detail' => 'صفحه پست',
    ];

    /** @param array<int, array{post_id: int, source: string}> $items */
    public function recordImpressions(User $viewer, array $items): void
    {
        if ($items === []) {
            return;
        }

        $byPost = [];
        foreach ($items as $item) {
            $postId = (int) ($item['post_id'] ?? 0);
            if ($postId <= 0 || isset($byPost[$postId])) {
                continue;
            }
            $source = (string) ($item['source'] ?? 'feed');
            if (! array_key_exists($source, self::SOURCE_LABELS)) {
                $source = 'feed';
            }
            $byPost[$postId] = $source;
        }

        if ($byPost === []) {
            return;
        }

        $validIds = Post::query()
            ->visible()
            ->whereIn('id', array_keys($byPost))
            ->where('user_id', '!=', $viewer->id)
            ->pluck('id')
            ->all();

        if ($validIds === []) {
            return;
        }

        $today = now()->toDateString();
        $existing = PostView::query()
            ->where('user_id', $viewer->id)
            ->whereDate('viewed_on', $today)
            ->whereIn('post_id', $validIds)
            ->get()
            ->keyBy('post_id');

        foreach ($validIds as $postId) {
            $row = $existing->get($postId);
            if ($row) {
                $row->increment('views');
            } else {
                PostView::query()->create([
                    'post_id' => $postId,
                    'user_id' => $viewer->id,
                    'viewed_on' => $today,
                    'views' => 1,
                    'source' => $byPost[$postId],
                ]);
            }
        }
    }

    /** @return array<string, mixed> */
    public function overview(User $user, int $range = 7): array
    {
        $range = in_array($range, [7, 30, 90], true) ? $range : 7;
        $isPro = Membership::isPro($user);

        if ($range > 7 && ! $isPro) {
            throw new HttpResponseException(response()->json([
                'message' => 'مشاهده آمار ۳۰ و ۹۰ روزه مخصوص اشتراک طبیار پرو است.',
                'code' => 'upgrade_required',
            ], 402));
        }

        $end = now()->endOfDay();
        $start = now()->subDays($range - 1)->startOfDay();
        $prevEnd = $start->copy()->subSecond();
        $prevStart = $start->copy()->subDays($range)->startOfDay();

        $postIds = $user->posts()->visible()->pluck('id');
        $topicIds = $user->topics()->whereNull('hidden_at')->pluck('id');
        $storyIds = Story::withTrashed()->where('user_id', $user->id)->pluck('id');

        $current = $this->windowMetrics($user, $postIds->all(), $topicIds->all(), $storyIds->all(), $start, $end);
        $previous = $this->windowMetrics($user, $postIds->all(), $topicIds->all(), $storyIds->all(), $prevStart, $prevEnd);

        $followersTotal = $user->followers()->count();
        $contentCount = $user->posts()->visible()->where('type', '!=', 'repost')->whereBetween('created_at', [$start, $end])->count()
            + Topic::query()->where('user_id', $user->id)->whereNull('hidden_at')->whereBetween('created_at', [$start, $end])->count()
            + Story::withTrashed()->where('user_id', $user->id)->whereBetween('created_at', [$start, $end])->count();

        return [
            'range' => $range,
            'is_pro' => $isPro,
            'summary' => [
                'reach' => $this->metric($current['reach'], $previous['reach']),
                'impressions' => $this->metric($current['impressions'], $previous['impressions']),
                'engaged_accounts' => $this->metric($current['engaged_accounts'], $previous['engaged_accounts']),
                'engagements_total' => $this->metric($current['engagements_total'], $previous['engagements_total']),
                'followers_total' => $followersTotal,
                'followers_new' => $this->metric($current['followers_new'], $previous['followers_new']),
                'profile_views' => $this->metric($current['profile_views'], $previous['profile_views']),
                'content_count' => $contentCount,
            ],
            'breakdown' => $current['breakdown'],
            'series' => $this->dailySeries($user, $postIds->all(), $start, $end),
            'top_posts' => $isPro ? $this->topPosts($user, $start, $end) : null,
            'audience' => $isPro ? $this->audience($user, $followersTotal) : null,
        ];
    }

    /** @return array<string, mixed> */
    public function postInsights(User $viewer, Post $post): array
    {
        abort_unless($post->user_id === $viewer->id, 403);

        if (! Membership::isPro($viewer)) {
            throw new HttpResponseException(response()->json([
                'message' => 'آمار اختصاصی هر پست مخصوص اشتراک طبیار پرو است.',
                'code' => 'upgrade_required',
            ], 402));
        }

        $post->loadMissing(['media']);

        $impressions = (int) PostView::query()->where('post_id', $post->id)->sum('views');
        $reach = (int) PostView::query()->where('post_id', $post->id)->distinct('user_id')->count('user_id');

        $likes = $post->reactions()->count();
        $comments = $post->comments()->whereNull('hidden_at')->count();
        $bookmarks = $post->bookmarks()->count();
        $reposts = $post->reposts()->visible()->count();
        $engagements = $likes + $comments + $bookmarks + $reposts;
        $engagementRate = $reach > 0 ? round(($engagements / $reach) * 100, 1) : 0.0;

        $sourceRows = PostView::query()
            ->where('post_id', $post->id)
            ->selectRaw('source, SUM(views) as total')
            ->groupBy('source')
            ->orderByDesc('total')
            ->get();

        $totalSourceViews = max(1, (int) $sourceRows->sum('total'));
        $sources = $sourceRows->map(fn ($row): array => [
            'source' => $row->source,
            'label' => self::SOURCE_LABELS[$row->source] ?? $row->source,
            'count' => (int) $row->total,
            'percent' => (int) round(((int) $row->total / $totalSourceViews) * 100),
        ])->values()->all();

        $engagedUserIds = Reaction::query()->where('post_id', $post->id)->pluck('user_id')
            ->merge(Comment::query()->where('post_id', $post->id)->whereNull('hidden_at')->pluck('user_id'))
            ->merge(Bookmark::query()->where('post_id', $post->id)->pluck('user_id'))
            ->unique()
            ->values();

        $roles = $this->roleDistribution($engagedUserIds->all());

        $start = now()->subDays(13)->startOfDay();
        $end = now()->endOfDay();
        $daily = PostView::query()
            ->where('post_id', $post->id)
            ->whereBetween('viewed_on', [$start->toDateString(), $end->toDateString()])
            ->selectRaw('viewed_on, SUM(views) as impressions, COUNT(DISTINCT user_id) as reach')
            ->groupBy('viewed_on')
            ->get()
            ->keyBy(fn ($row) => Carbon::parse($row->viewed_on)->toDateString());

        $series = [];
        foreach (CarbonPeriod::create($start, $end) as $date) {
            $day = $date->format('Y-m-d');
            $row = $daily->get($day);
            $series[] = [
                'date' => $day,
                'impressions' => (int) ($row->impressions ?? 0),
                'reach' => (int) ($row->reach ?? 0),
            ];
        }

        return [
            'post' => [
                'id' => $post->id,
                'excerpt' => mb_strimwidth((string) ($post->body ?: $post->link_title ?: 'پست تصویری'), 0, 80, '...'),
                'cover_url' => $post->media->first() ? Present::publicUrl($post->media->first()->path) : null,
                'created_at' => $post->created_at?->toIso8601String(),
            ],
            'summary' => [
                'impressions' => $impressions,
                'reach' => $reach,
                'engagements' => $engagements,
                'engagement_rate' => $engagementRate,
                'likes' => $likes,
                'comments' => $comments,
                'bookmarks' => $bookmarks,
                'reposts' => $reposts,
            ],
            'sources' => $sources,
            'roles' => $roles,
            'series' => $series,
        ];
    }

    /**
     * @param  array<int, int>  $postIds
     * @param  array<int, int>  $topicIds
     * @param  array<int, int>  $storyIds
     * @return array<string, mixed>
     */
    private function windowMetrics(User $user, array $postIds, array $topicIds, array $storyIds, Carbon $start, Carbon $end): array
    {
        $startDate = $start->toDateString();
        $endDate = $end->toDateString();

        $impressions = 0;
        $reach = 0;
        $likes = 0;
        $comments = 0;
        $bookmarks = 0;
        $reposts = 0;
        $engagedUsers = collect();

        if ($postIds !== []) {
            $impressions = (int) PostView::query()
                ->whereIn('post_id', $postIds)
                ->whereBetween('viewed_on', [$startDate, $endDate])
                ->sum('views');

            $reach = (int) PostView::query()
                ->whereIn('post_id', $postIds)
                ->whereBetween('viewed_on', [$startDate, $endDate])
                ->distinct('user_id')
                ->count('user_id');

            $likesQuery = Reaction::query()->whereIn('post_id', $postIds)->whereBetween('created_at', [$start, $end]);
            $commentsQuery = Comment::query()->whereIn('post_id', $postIds)->whereNull('hidden_at')->whereBetween('created_at', [$start, $end]);
            $bookmarksQuery = Bookmark::query()->whereIn('post_id', $postIds)->whereBetween('created_at', [$start, $end]);
            $repostsQuery = Post::query()->visible()->whereIn('repost_of_id', $postIds)->whereBetween('created_at', [$start, $end]);

            $likes = (clone $likesQuery)->count();
            $comments = (clone $commentsQuery)->count();
            $bookmarks = (clone $bookmarksQuery)->count();
            $reposts = (clone $repostsQuery)->count();

            $engagedUsers = $engagedUsers
                ->merge((clone $likesQuery)->pluck('user_id'))
                ->merge((clone $commentsQuery)->pluck('user_id'))
                ->merge((clone $bookmarksQuery)->pluck('user_id'))
                ->merge((clone $repostsQuery)->pluck('user_id'));
        }

        $topicReplies = 0;
        $pollVotes = 0;
        if ($topicIds !== []) {
            $repliesQuery = TopicReply::query()->whereIn('topic_id', $topicIds)->whereNull('hidden_at')->whereBetween('created_at', [$start, $end]);
            $votesQuery = PollVote::query()->whereIn('topic_id', $topicIds)->whereBetween('created_at', [$start, $end]);
            $topicReplies = (clone $repliesQuery)->count();
            $pollVotes = (clone $votesQuery)->count();

            $engagedUsers = $engagedUsers
                ->merge((clone $repliesQuery)->pluck('user_id'))
                ->merge((clone $votesQuery)->pluck('user_id'));
        }

        $storyViews = 0;
        if ($storyIds !== []) {
            $storyQuery = StoryView::query()->whereIn('story_id', $storyIds)->whereBetween('viewed_at', [$start, $end]);
            $storyViews = (clone $storyQuery)->count();
            $engagedUsers = $engagedUsers->merge((clone $storyQuery)->pluck('user_id'));
        }

        $followersNew = DB::table('follows')
            ->where('following_id', $user->id)
            ->whereBetween('created_at', [$start, $end])
            ->count();

        $profileViews = ProfileView::query()
            ->where('profile_id', $user->id)
            ->whereBetween('viewed_on', [$startDate, $endDate])
            ->count();

        return [
            'impressions' => $impressions,
            'reach' => $reach,
            'engaged_accounts' => $engagedUsers->reject(fn ($id) => (int) $id === $user->id)->unique()->count(),
            'engagements_total' => $likes + $comments + $bookmarks + $reposts + $topicReplies + $pollVotes + $storyViews,
            'followers_new' => $followersNew,
            'profile_views' => $profileViews,
            'breakdown' => [
                'likes' => $likes,
                'comments' => $comments,
                'bookmarks' => $bookmarks,
                'reposts' => $reposts,
                'topic_replies' => $topicReplies,
                'poll_votes' => $pollVotes,
                'story_views' => $storyViews,
            ],
        ];
    }

    /**
     * @param  array<int, int>  $postIds
     * @return array<int, array<string, int|string>>
     */
    private function dailySeries(User $user, array $postIds, Carbon $start, Carbon $end): array
    {
        $startDate = $start->toDateString();
        $endDate = $end->toDateString();

        $viewsByDay = collect();
        $likesByDay = collect();
        $commentsByDay = collect();
        $bookmarksByDay = collect();

        if ($postIds !== []) {
            $viewsByDay = PostView::query()
                ->whereIn('post_id', $postIds)
                ->whereBetween('viewed_on', [$startDate, $endDate])
                ->selectRaw('viewed_on as day, SUM(views) as impressions, COUNT(DISTINCT user_id) as reach')
                ->groupBy('viewed_on')
                ->get()
                ->keyBy(fn ($row) => Carbon::parse($row->day)->toDateString());

            $likesByDay = Reaction::query()
                ->whereIn('post_id', $postIds)
                ->whereBetween('created_at', [$start, $end])
                ->selectRaw('DATE(created_at) as day, COUNT(*) as cnt')
                ->groupBy('day')
                ->pluck('cnt', 'day');

            $commentsByDay = Comment::query()
                ->whereIn('post_id', $postIds)
                ->whereNull('hidden_at')
                ->whereBetween('created_at', [$start, $end])
                ->selectRaw('DATE(created_at) as day, COUNT(*) as cnt')
                ->groupBy('day')
                ->pluck('cnt', 'day');

            $bookmarksByDay = Bookmark::query()
                ->whereIn('post_id', $postIds)
                ->whereBetween('created_at', [$start, $end])
                ->selectRaw('DATE(created_at) as day, COUNT(*) as cnt')
                ->groupBy('day')
                ->pluck('cnt', 'day');
        }

        $followersByDay = DB::table('follows')
            ->where('following_id', $user->id)
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw('DATE(created_at) as day, COUNT(*) as cnt')
            ->groupBy('day')
            ->pluck('cnt', 'day');

        $profileByDay = ProfileView::query()
            ->where('profile_id', $user->id)
            ->whereBetween('viewed_on', [$startDate, $endDate])
            ->selectRaw('viewed_on as day, COUNT(*) as cnt')
            ->groupBy('viewed_on')
            ->get()
            ->mapWithKeys(fn ($row) => [Carbon::parse($row->day)->toDateString() => (int) $row->cnt]);

        $series = [];
        foreach (CarbonPeriod::create($start, $end) as $date) {
            $day = $date->format('Y-m-d');
            $viewRow = $viewsByDay->get($day);
            $engagements = (int) ($likesByDay[$day] ?? 0) + (int) ($commentsByDay[$day] ?? 0) + (int) ($bookmarksByDay[$day] ?? 0);
            $series[] = [
                'date' => $day,
                'impressions' => (int) ($viewRow->impressions ?? 0),
                'reach' => (int) ($viewRow->reach ?? 0),
                'engagements' => $engagements,
                'followers' => (int) ($followersByDay[$day] ?? 0),
                'profile_views' => (int) ($profileByDay[$day] ?? 0),
            ];
        }

        return $series;
    }

    /** @return array<int, array<string, mixed>> */
    private function topPosts(User $user, Carbon $start, Carbon $end): array
    {
        $posts = $user->posts()
            ->visible()
            ->where('type', '!=', 'repost')
            ->with('media')
            ->withCount([
                'reactions' => fn ($q) => $q->whereBetween('created_at', [$start, $end]),
                'comments' => fn ($q) => $q->whereNull('hidden_at')->whereBetween('created_at', [$start, $end]),
                'bookmarks' => fn ($q) => $q->whereBetween('created_at', [$start, $end]),
                'reposts' => fn ($q) => $q->visible()->whereBetween('created_at', [$start, $end]),
            ])
            ->latest('created_at')
            ->limit(60)
            ->get();

        if ($posts->isEmpty()) {
            return [];
        }

        $viewStats = PostView::query()
            ->whereIn('post_id', $posts->pluck('id'))
            ->whereBetween('viewed_on', [$start->toDateString(), $end->toDateString()])
            ->selectRaw('post_id, SUM(views) as impressions, COUNT(DISTINCT user_id) as reach')
            ->groupBy('post_id')
            ->get()
            ->keyBy('post_id');

        return $posts->map(function (Post $post) use ($viewStats): array {
            $views = $viewStats->get($post->id);
            $impressions = (int) ($views->impressions ?? 0);
            $reach = (int) ($views->reach ?? 0);
            $engagements = (int) $post->reactions_count + (int) $post->comments_count + (int) $post->bookmarks_count + (int) $post->reposts_count;

            return [
                'id' => $post->id,
                'excerpt' => mb_strimwidth((string) ($post->body ?: $post->link_title ?: 'پست تصویری'), 0, 72, '...'),
                'cover_url' => $post->media->first() ? Present::publicUrl($post->media->first()->path) : null,
                'created_at' => $post->created_at?->toIso8601String(),
                'impressions' => $impressions,
                'reach' => $reach,
                'engagements' => $engagements,
                '_sort' => $impressions + ($engagements * 3),
            ];
        })
            ->sortByDesc('_sort')
            ->take(6)
            ->map(function (array $row): array {
                unset($row['_sort']);

                return $row;
            })
            ->values()
            ->all();
    }

    /** @return array<string, mixed> */
    private function audience(User $user, int $followersTotal): array
    {
        $followerIds = $user->followers()->pluck('users.id')->all();
        if ($followerIds === []) {
            return [
                'total_followers' => $followersTotal,
                'roles' => [],
                'specialties' => [],
                'cities' => [],
            ];
        }

        $roles = $this->roleDistribution($followerIds);

        $total = max(1, count($followerIds));
        $specialties = User::query()
            ->whereIn('id', $followerIds)
            ->whereNotNull('specialty_title')
            ->where('specialty_title', '!=', '')
            ->selectRaw('specialty_title, COUNT(*) as cnt')
            ->groupBy('specialty_title')
            ->orderByDesc('cnt')
            ->limit(5)
            ->get()
            ->map(fn ($row): array => [
                'label' => $row->specialty_title,
                'count' => (int) $row->cnt,
                'percent' => (int) round(((int) $row->cnt / $total) * 100),
            ])->values()->all();

        $cities = User::query()
            ->whereIn('id', $followerIds)
            ->whereNotNull('city')
            ->where('city', '!=', '')
            ->selectRaw('city, COUNT(*) as cnt')
            ->groupBy('city')
            ->orderByDesc('cnt')
            ->limit(5)
            ->get()
            ->map(fn ($row): array => [
                'label' => $row->city,
                'count' => (int) $row->cnt,
                'percent' => (int) round(((int) $row->cnt / $total) * 100),
            ])->values()->all();

        return [
            'total_followers' => $followersTotal,
            'roles' => $roles,
            'specialties' => $specialties,
            'cities' => $cities,
        ];
    }

    /**
     * @param  array<int, int>  $userIds
     * @return array<int, array{label: string, count: int, percent: int}>
     */
    private function roleDistribution(array $userIds): array
    {
        if ($userIds === []) {
            return [];
        }

        $total = max(1, count($userIds));

        return User::query()
            ->whereIn('id', $userIds)
            ->selectRaw('role, COUNT(*) as cnt')
            ->groupBy('role')
            ->orderByDesc('cnt')
            ->get()
            ->map(fn ($row): array => [
                'label' => Labels::userRole($row->role),
                'count' => (int) $row->cnt,
                'percent' => (int) round(((int) $row->cnt / $total) * 100),
            ])
            ->values()
            ->all();
    }

    /** @return array{value: int, previous: int, delta_pct: ?int} */
    private function metric(int $value, int $previous): array
    {
        if ($previous === 0) {
            $delta = $value > 0 ? 100 : null;
        } else {
            $delta = (int) round((($value - $previous) / $previous) * 100);
        }

        return [
            'value' => $value,
            'previous' => $previous,
            'delta_pct' => $delta,
        ];
    }
}
