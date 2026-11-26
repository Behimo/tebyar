<?php

namespace Tests\Feature;

use App\Models\Block;
use App\Models\Hashtag;
use App\Models\Post;
use App\Models\Reaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ExploreTest extends TestCase
{
    use RefreshDatabase;

    public function test_explore_excludes_own_posts_reposts_and_blocked_users_and_ranks_relevance(): void
    {
        $viewer = User::factory()->create([
            'specialty_title' => 'متخصص قلب',
            'city' => 'تهران',
        ]);
        $matchAuthor = User::factory()->create([
            'specialty_title' => 'متخصص قلب',
            'city' => 'تهران',
        ]);
        $otherAuthor = User::factory()->create([
            'specialty_title' => 'پزشک عمومی',
            'city' => 'مشهد',
        ]);
        $blockedAuthor = User::factory()->create();
        Block::query()->create(['blocker_id' => $viewer->id, 'blocked_id' => $blockedAuthor->id]);

        $ownPost = Post::query()->create(['user_id' => $viewer->id, 'type' => 'text', 'body' => 'پست خودم']);
        $blockedPost = Post::query()->create(['user_id' => $blockedAuthor->id, 'type' => 'text', 'body' => 'پست مسدود']);
        $lowPost = Post::query()->create(['user_id' => $otherAuthor->id, 'type' => 'text', 'body' => 'پست ساده']);
        $highPost = Post::query()->create(['user_id' => $matchAuthor->id, 'type' => 'text', 'body' => 'پست پربازخورد #قلب']);
        $repost = Post::query()->create(['user_id' => $otherAuthor->id, 'type' => 'repost', 'repost_of_id' => $highPost->id]);

        $tag = Hashtag::query()->create(['name' => 'قلب']);
        $highPost->hashtags()->attach($tag->id);

        foreach (range(1, 5) as $_) {
            Reaction::query()->create(['post_id' => $highPost->id, 'user_id' => User::factory()->create()->id, 'type' => 'like']);
        }

        Sanctum::actingAs($viewer);

        $response = $this->getJson('/api/v1/explore')->assertOk();
        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertNotContains($ownPost->id, $ids);
        $this->assertNotContains($blockedPost->id, $ids);
        $this->assertNotContains($repost->id, $ids);
        $this->assertSame($highPost->id, $ids[0]);
        $this->assertContains($lowPost->id, $ids);
        $this->assertContains('قلب', $response->json('tags'));
    }

    public function test_explore_enforces_author_diversity_tag_filter_and_pagination(): void
    {
        $viewer = User::factory()->create();
        $prolific = User::factory()->create();

        $cardio = Hashtag::query()->create(['name' => 'قلب']);

        for ($i = 0; $i < 6; $i++) {
            $p = Post::query()->create(['user_id' => $prolific->id, 'type' => 'text', 'body' => "پست {$i} #قلب"]);
            $p->hashtags()->attach($cardio->id);
        }

        for ($a = 0; $a < 13; $a++) {
            $author = User::factory()->create();
            Post::query()->create(['user_id' => $author->id, 'type' => 'text', 'body' => "متن {$a}-1"]);
            Post::query()->create(['user_id' => $author->id, 'type' => 'text', 'body' => "متن {$a}-2"]);
        }

        Sanctum::actingAs($viewer);

        $page1 = $this->getJson('/api/v1/explore')->assertOk();
        $items1 = $page1->json('data');
        $this->assertCount(24, $items1);
        $this->assertNotNull($page1->json('next_page'));

        $prolificOnPage1 = collect($items1)->filter(fn ($row) => $row['author']['id'] === $prolific->id)->count();
        $this->assertLessThanOrEqual(2, $prolificOnPage1);

        // No two consecutive posts from the same author
        for ($i = 1; $i < count($items1); $i++) {
            $this->assertNotSame($items1[$i - 1]['author']['id'], $items1[$i]['author']['id']);
        }

        $page2 = $this->getJson('/api/v1/explore?page=2')->assertOk();
        $ids1 = collect($items1)->pluck('id')->all();
        $ids2 = collect($page2->json('data'))->pluck('id')->all();
        $this->assertEmpty(array_intersect($ids1, $ids2));

        $tagged = $this->getJson('/api/v1/explore?tag=قلب')->assertOk()->json('data');
        $this->assertNotEmpty($tagged);
        foreach ($tagged as $row) {
            $this->assertContains('قلب', $row['hashtags']);
        }
    }
}
