<?php

namespace App\Services;

use App\Models\Bookmark;
use App\Models\Comment;
use App\Models\Post;
use App\Models\PostView;
use App\Models\Reaction;
use App\Models\User;
use App\Support\Membership;
use App\Support\Present;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ExploreRanker
{
    private const PER_PAGE = 24;

    /**
     * @return array{
     *     posts: Collection<int, Post>,
     *     has_more: bool,
     *     next_page: ?string,
     *     tags: array<int, string>,
     *     suggested: Collection<int, User>
     * }
     */
    public function rank(User $viewer, int $page = 1, ?string $tag = null, ?string $baseUrl = null): array
    {
        $page = max(1, $page);
        $cleanTag = $tag ? mb_strtolower(ltrim(trim($tag), '#')) : '';
        $cacheKey = 'explore:'.$viewer->id.':'.$cleanTag;

        if ($page === 1) {
            $orderedIds = $this->computeOrderedIds($viewer, $cleanTag);
            Cache::put($cacheKey, $orderedIds, now()->addMinutes(10));
        } else {
            $orderedIds = Cache::get($cacheKey);
            if (! is_array($orderedIds)) {
                $orderedIds = $this->computeOrderedIds($viewer, $cleanTag);
                Cache::put($cacheKey, $orderedIds, now()->addMinutes(10));
            }
        }

        $offset = ($page - 1) * self::PER_PAGE;
        $pageIds = array_slice($orderedIds, $offset, self::PER_PAGE);
        $hasMore = count($orderedIds) > ($offset + self::PER_PAGE);

        $posts = collect();
        if ($pageIds !== []) {
            $position = array_flip($pageIds);
            $posts = Post::query()
                ->whereIn('id', $pageIds)
                ->with(['author', 'media', 'hashtags', 'original.author', 'original.media', 'original.hashtags'])
                ->withCount(['reactions', 'comments', 'reposts'])
                ->withViewerState($viewer)
                ->get()
                ->sortBy(fn (Post $post) => $position[$post->id] ?? PHP_INT_MAX)
                ->values();
        }

        $nextPage = null;
        if ($hasMore) {
            $query = ['page' => $page + 1];
            if ($cleanTag !== '') {
                $query['tag'] = $cleanTag;
            }
            $base = $baseUrl ?: url('/api/v1/explore');
            $nextPage = $base.'?'.http_build_query($query);
        }

        return [
            'posts' => $posts,
            'has_more' => $hasMore,
            'next_page' => $nextPage,
            'tags' => $page === 1 ? $this->trendingTags() : [],
            'suggested' => $page === 1 ? $this->suggestedDoctors($viewer) : collect(),
        ];
    }

    /** @return array<int, int> */
    private function computeOrderedIds(User $viewer, string $cleanTag): array
    {
        $hidden = Present::hiddenIds($viewer);

        $baseQuery = fn () => Post::query()
            ->visible()
            ->where('type', '!=', 'repost')
            ->where('user_id', '!=', $viewer->id)
            ->when($hidden !== [], fn ($q) => $q->whereNotIn('user_id', $hidden))
            ->when($cleanTag !== '', fn ($q) => $q->whereHas('hashtags', fn ($h) => $h->where('name', $cleanTag)));

        $candidates = $baseQuery()
            ->where('created_at', '>=', now()->subDays(60))
            ->with(['author', 'hashtags'])
            ->withCount(['reactions', 'comments', 'reposts', 'bookmarks', 'media'])
            ->latest('posts.created_at')
            ->limit(400)
            ->get();

        if ($candidates->count() < 30) {
            $candidates = $baseQuery()
                ->with(['author', 'hashtags'])
                ->withCount(['reactions', 'comments', 'reposts', 'bookmarks', 'media'])
                ->latest('posts.created_at')
                ->limit(400)
                ->get();
        }

        if ($candidates->isEmpty()) {
            return [];
        }

        $followingIds = $viewer->following()->pluck('users.id')->all();
        $followingSet = array_flip($followingIds);

        $authorIds = $candidates->pluck('user_id')->unique()->values()->all();
        $mutualFollowCounts = [];
        if ($followingIds !== [] && $authorIds !== []) {
            $mutualFollowCounts = DB::table('follows')
                ->selectRaw('following_id, COUNT(*) as cnt')
                ->whereIn('follower_id', $followingIds)
                ->whereIn('following_id', $authorIds)
                ->groupBy('following_id')
                ->pluck('cnt', 'following_id')
                ->all();
        }

        $engagedPostIds = Reaction::query()->where('user_id', $viewer->id)->pluck('post_id')
            ->merge(Bookmark::query()->where('user_id', $viewer->id)->pluck('post_id'))
            ->merge(Comment::query()->where('user_id', $viewer->id)->pluck('post_id'))
            ->unique()
            ->values();

        $likedOrSavedSet = array_flip(
            Reaction::query()->where('user_id', $viewer->id)->pluck('post_id')
                ->merge(Bookmark::query()->where('user_id', $viewer->id)->pluck('post_id'))
                ->unique()
                ->all()
        );

        $engagedHashtagIds = $engagedPostIds->isNotEmpty()
            ? array_flip(DB::table('hashtag_post')->whereIn('post_id', $engagedPostIds)->pluck('hashtag_id')->unique()->all())
            : [];

        $engagedAuthorIds = $engagedPostIds->isNotEmpty()
            ? array_flip(Post::query()->whereIn('id', $engagedPostIds)->pluck('user_id')->unique()->all())
            : [];

        $candidateIds = $candidates->pluck('id')->all();
        $viewCounts = PostView::query()
            ->selectRaw('post_id, SUM(views) as total_views')
            ->where('user_id', $viewer->id)
            ->whereIn('post_id', $candidateIds)
            ->groupBy('post_id')
            ->pluck('total_views', 'post_id')
            ->all();

        $today = now()->toDateString();
        $now = now();
        $viewerSpec = trim((string) ($viewer->specialty_title ?? ''));
        $viewerCity = trim((string) ($viewer->city ?? ''));

        $scored = $candidates->map(function (Post $post) use (
            $viewer,
            $viewerSpec,
            $viewerCity,
            $followingSet,
            $mutualFollowCounts,
            $engagedHashtagIds,
            $engagedAuthorIds,
            $likedOrSavedSet,
            $viewCounts,
            $today,
            $now,
        ): array {
            $likes = (int) $post->reactions_count;
            $comments = (int) $post->comments_count;
            $reposts = (int) $post->reposts_count;
            $saves = (int) $post->bookmarks_count;

            $quality = log(1 + $likes + (2 * $comments) + (3 * $reposts) + (2 * $saves)) + 1.0;

            $ageHours = max(0.0, $post->created_at ? $post->created_at->diffInMinutes($now) / 60.0 : 0.0);
            $recency = 1.0 / pow(1.0 + ($ageHours / 48.0), 1.2);

            $affinity = 1.0;
            $author = $post->author;
            if ($author) {
                if ($viewerSpec !== '' && trim((string) $author->specialty_title) === $viewerSpec) {
                    $affinity += 0.45;
                }
                if ($viewerCity !== '' && trim((string) $author->city) === $viewerCity) {
                    $affinity += 0.20;
                }
                $mutuals = (int) ($mutualFollowCounts[$author->id] ?? 0);
                if ($mutuals > 0) {
                    $affinity += min(0.30, $mutuals * 0.10);
                }
            }

            if ($engagedHashtagIds !== []) {
                $tagBoost = 0.0;
                foreach ($post->hashtags as $hashtag) {
                    if (isset($engagedHashtagIds[$hashtag->id])) {
                        $tagBoost += 0.15;
                    }
                }
                $affinity += min(0.35, $tagBoost);
            }

            if (isset($engagedAuthorIds[$post->user_id])) {
                $affinity += 0.25;
            }

            $format = ((int) $post->media_count > 0)
                ? 1.3
                : ((! empty($post->link_url) || $post->type === 'link') ? 1.0 : 0.8);

            $discovery = isset($followingSet[$post->user_id]) ? 0.55 : 1.0;

            $trust = ($author && ($author->license_verified_at !== null || $author->specialty_verified_at !== null))
                ? 1.1
                : 1.0;

            $seenViews = (int) ($viewCounts[$post->id] ?? 0);
            $seenPenalty = $seenViews > 0 ? (1.0 / (1.0 + $seenViews)) : 1.0;
            $engagedPenalty = isset($likedOrSavedSet[$post->id]) ? 0.4 : 1.0;

            $hash = crc32($viewer->id.':'.$post->id.':'.$today);
            $jitter = 0.90 + (($hash % 201) / 1000.0);

            $score = $quality * $recency * $affinity * $format * $discovery * $trust * $seenPenalty * $engagedPenalty * $jitter;

            return [
                'id' => $post->id,
                'user_id' => $post->user_id,
                'score' => $score,
            ];
        })
            ->sortByDesc('score')
            ->values()
            ->all();

        return $this->diversify($scored);
    }

    /**
     * Enforce max 2 posts per author per 24-item page and no back-to-back same author.
     *
     * @param  array<int, array{id: int, user_id: int, score: float}>  $items
     * @return array<int, int>
     */
    private function diversify(array $items): array
    {
        $queue = $items;
        $result = [];
        $pageCounts = [];
        $lastAuthor = null;

        while ($queue !== []) {
            if (count($result) % self::PER_PAGE === 0) {
                $pageCounts = [];
            }

            $pickedIndex = null;
            foreach ($queue as $idx => $item) {
                $authorId = $item['user_id'];
                if ($authorId !== $lastAuthor && ($pageCounts[$authorId] ?? 0) < 2) {
                    $pickedIndex = $idx;
                    break;
                }
            }

            // Relax consecutive check only if no item fits both constraints in this page
            if ($pickedIndex === null) {
                foreach ($queue as $idx => $item) {
                    $authorId = $item['user_id'];
                    if (($pageCounts[$authorId] ?? 0) < 2) {
                        $pickedIndex = $idx;
                        break;
                    }
                }
            }

            // If all remaining items exceed per-page author cap, pick top remaining that isn't back-to-back
            if ($pickedIndex === null) {
                foreach ($queue as $idx => $item) {
                    if ($item['user_id'] !== $lastAuthor) {
                        $pickedIndex = $idx;
                        break;
                    }
                }
            }

            if ($pickedIndex === null) {
                $pickedIndex = 0;
            }

            $picked = $queue[$pickedIndex];
            array_splice($queue, $pickedIndex, 1);

            $result[] = $picked['id'];
            $authorId = $picked['user_id'];
            $pageCounts[$authorId] = ($pageCounts[$authorId] ?? 0) + 1;
            $lastAuthor = $authorId;
        }

        return $result;
    }

    /** @return array<int, string> */
    private function trendingTags(): array
    {
        $tags = DB::table('hashtags')
            ->join('hashtag_post', 'hashtags.id', '=', 'hashtag_post.hashtag_id')
            ->join('posts', 'posts.id', '=', 'hashtag_post.post_id')
            ->whereNull('posts.hidden_at')
            ->whereNull('posts.removed_at')
            ->where('posts.created_at', '>=', now()->subDays(14))
            ->selectRaw('hashtags.name, COUNT(*) as uses')
            ->groupBy('hashtags.id', 'hashtags.name')
            ->orderByDesc('uses')
            ->limit(12)
            ->pluck('hashtags.name')
            ->all();

        if (count($tags) < 5) {
            $tags = DB::table('hashtags')
                ->join('hashtag_post', 'hashtags.id', '=', 'hashtag_post.hashtag_id')
                ->join('posts', 'posts.id', '=', 'hashtag_post.post_id')
                ->whereNull('posts.hidden_at')
                ->whereNull('posts.removed_at')
                ->selectRaw('hashtags.name, COUNT(*) as uses')
                ->groupBy('hashtags.id', 'hashtags.name')
                ->orderByDesc('uses')
                ->limit(12)
                ->pluck('hashtags.name')
                ->all();
        }

        return array_values($tags);
    }

    /** @return Collection<int, User> */
    private function suggestedDoctors(User $viewer): Collection
    {
        $hidden = Present::hiddenIds($viewer);
        $followingIds = $viewer->following()->pluck('users.id')->all();
        $exclude = array_values(array_unique(array_merge([$viewer->id], $hidden, $followingIds)));

        $candidates = User::query()
            ->where('account_status', 'verified')
            ->whereIn('role', Membership::MEDICAL)
            ->whereNotIn('id', $exclude)
            ->withCount(['followers', 'following', 'posts'])
            ->limit(60)
            ->get();

        if ($candidates->isEmpty()) {
            return collect();
        }

        $mutualCounts = [];
        if ($followingIds !== []) {
            $mutualCounts = DB::table('follows')
                ->selectRaw('following_id, COUNT(*) as cnt')
                ->whereIn('follower_id', $followingIds)
                ->whereIn('following_id', $candidates->pluck('id')->all())
                ->groupBy('following_id')
                ->pluck('cnt', 'following_id')
                ->all();
        }

        $spec = trim((string) ($viewer->specialty_title ?? ''));
        $city = trim((string) ($viewer->city ?? ''));

        return $candidates->sortByDesc(function (User $candidate) use ($spec, $city, $mutualCounts): float {
            $score = 0.0;
            if ($spec !== '' && trim((string) $candidate->specialty_title) === $spec) {
                $score += 5.0;
            }
            if ($city !== '' && trim((string) $candidate->city) === $city) {
                $score += 2.5;
            }
            $score += min(4.0, (int) ($mutualCounts[$candidate->id] ?? 0) * 1.5);
            if ($candidate->license_verified_at || $candidate->specialty_verified_at) {
                $score += 1.0;
            }
            $score += min(3.0, log(1 + (int) $candidate->followers_count));

            return $score;
        })->take(8)->values();
    }
}
