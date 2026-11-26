<?php

namespace Tests\Feature;

use App\Models\Post;
use App\Models\Reaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InsightsTest extends TestCase
{
    use RefreshDatabase;

    public function test_impressions_and_profile_views_feed_overview_and_respect_pro_gates(): void
    {
        $owner = User::factory()->create(['pro_until' => null]);
        $viewer1 = User::factory()->create(['role' => 'resident', 'specialty_title' => 'داخلی', 'city' => 'تهران']);
        $viewer2 = User::factory()->create(['role' => 'specialist', 'specialty_title' => 'قلب', 'city' => 'اصفهان']);

        $ownPost = Post::query()->create(['user_id' => $owner->id, 'type' => 'text', 'body' => 'پست آموزشی']);

        Sanctum::actingAs($viewer1);
        $viewer1->following()->attach($owner->id);
        $this->getJson("/api/v1/doctors/{$owner->slug}")->assertOk();
        // Repeated profile load same day does not inflate unique daily profile_views
        $this->getJson("/api/v1/doctors/{$owner->slug}")->assertOk();

        $this->postJson('/api/v1/impressions', [
            'items' => [
                ['post_id' => $ownPost->id, 'source' => 'feed'],
            ],
        ])->assertOk();

        $this->postJson('/api/v1/impressions', [
            'items' => [
                ['post_id' => $ownPost->id, 'source' => 'explore'],
            ],
        ])->assertOk();

        Reaction::query()->create(['post_id' => $ownPost->id, 'user_id' => $viewer1->id, 'type' => 'like']);

        Sanctum::actingAs($viewer2);
        $this->postJson('/api/v1/impressions', [
            'items' => [
                ['post_id' => $ownPost->id, 'source' => 'explore'],
            ],
        ])->assertOk();

        // Owner self impression is ignored
        Sanctum::actingAs($owner);
        $this->postJson('/api/v1/impressions', [
            'items' => [
                ['post_id' => $ownPost->id, 'source' => 'profile'],
            ],
        ])->assertOk();

        // Free user gets 7-day summary with null top_posts/audience
        $freeOverview = $this->getJson('/api/v1/me/insights?range=7')->assertOk()->json('data');
        $this->assertFalse($freeOverview['is_pro']);
        $this->assertSame(3, $freeOverview['summary']['impressions']['value']);
        $this->assertSame(2, $freeOverview['summary']['reach']['value']);
        $this->assertSame(1, $freeOverview['summary']['profile_views']['value']);
        $this->assertSame(1, $freeOverview['breakdown']['likes']);
        $this->assertNull($freeOverview['top_posts']);
        $this->assertNull($freeOverview['audience']);

        // Free user is blocked from 30d and post insights with 402
        $this->getJson('/api/v1/me/insights?range=30')->assertStatus(402)->assertJsonPath('code', 'upgrade_required');
        $this->getJson("/api/v1/posts/{$ownPost->id}/insights")->assertStatus(402)->assertJsonPath('code', 'upgrade_required');

        // Upgrade to Pro -> unlocks 30d, audience, top_posts, and post insights
        $owner->forceFill(['pro_until' => now()->addMonth()])->save();

        $proOverview = $this->getJson('/api/v1/me/insights?range=30')->assertOk()->json('data');
        $this->assertTrue($proOverview['is_pro']);
        $this->assertNotEmpty($proOverview['top_posts']);
        $this->assertSame(1, $proOverview['audience']['total_followers']);

        $postStats = $this->getJson("/api/v1/posts/{$ownPost->id}/insights")->assertOk()->json('data');
        $this->assertSame(3, $postStats['summary']['impressions']);
        $this->assertSame(2, $postStats['summary']['reach']);
        $this->assertSame(1, $postStats['summary']['likes']);

        // Non-owner cannot view someone else's post insights
        Sanctum::actingAs($viewer1);
        $this->getJson("/api/v1/posts/{$ownPost->id}/insights")->assertForbidden();
    }
}
