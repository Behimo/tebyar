<?php

namespace Tests\Feature;

use App\Models\Community;
use App\Models\Post;
use App\Models\Story;
use App\Models\User;
use App\Support\AppSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MembershipQuotaTest extends TestCase
{
    use RefreshDatabase;

    public function test_free_user_hits_402_on_topic_and_comment_limits(): void
    {
        AppSettings::setMany([
            'limits_enabled' => true,
            'free_quotas' => [
                'posts' => 5,
                'stories' => 5,
                'topics' => 2,
                'comments' => 3,
                'conversations' => 3,
            ],
        ]);

        $community = Community::query()->create([
            'name' => 'قلب',
            'slug' => 'heart',
            'specialty' => 'قلب',
            'description' => 'آزمایش',
        ]);

        $user = User::factory()->create();
        $other = User::factory()->create();
        $post = $other->posts()->create(['type' => 'text', 'body' => 'پست آزمایشی']);

        Sanctum::actingAs($user);

        for ($i = 1; $i <= 2; $i++) {
            $topicId = $this->postJson('/api/v1/communities/heart/topics', [
                'kind' => 'discussion',
                'title' => "موضوع {$i}",
                'body' => 'متن',
            ])->assertCreated()->json('data.id');
        }

        $this->postJson('/api/v1/communities/heart/topics', [
            'kind' => 'discussion',
            'title' => 'موضوع سوم',
            'body' => 'متن',
        ])->assertStatus(402)->assertJsonPath('code', 'upgrade_required');

        // Comments quota is shared across post comments (2) and topic replies (1)
        $this->postJson("/api/v1/posts/{$post->id}/comments", ['body' => 'نظر ۱'])->assertCreated();
        $this->postJson("/api/v1/posts/{$post->id}/comments", ['body' => 'نظر ۲'])->assertCreated();
        $this->postJson("/api/v1/topics/{$topicId}/replies", ['body' => 'پاسخ ۳'])->assertCreated();

        $this->postJson("/api/v1/posts/{$post->id}/comments", ['body' => 'نظر ۴'])
            ->assertStatus(402)
            ->assertJsonPath('quota.key', 'comments');
    }

    public function test_deleting_story_or_post_does_not_free_free_quota(): void
    {
        Storage::fake('public');
        AppSettings::setMany([
            'limits_enabled' => true,
            'free_quotas' => [
                'posts' => 1,
                'stories' => 1,
                'topics' => 2,
                'comments' => 20,
                'conversations' => 3,
            ],
        ]);

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $postId = $this->postJson('/api/v1/posts', ['body' => 'پست اول'])->assertCreated()->json('data.id');
        $this->deleteJson("/api/v1/posts/{$postId}")->assertOk();
        $this->postJson('/api/v1/posts', ['body' => 'پست دوم'])->assertStatus(402);

        $storyId = $this->post('/api/v1/stories', [
            'media' => UploadedFile::fake()->image('story.jpg'),
        ], ['Accept' => 'application/json'])->assertCreated()->json('data.id');

        $this->deleteJson("/api/v1/stories/{$storyId}")->assertOk();
        $this->assertSoftDeleted(Story::class, ['id' => $storyId]);

        $this->post('/api/v1/stories', [
            'media' => UploadedFile::fake()->image('story2.jpg'),
        ], ['Accept' => 'application/json'])->assertStatus(402);
    }

    public function test_conversation_quota_counts_started_chats_not_replies(): void
    {
        AppSettings::setMany([
            'limits_enabled' => true,
            'free_quotas' => [
                'posts' => 5,
                'stories' => 5,
                'topics' => 2,
                'comments' => 20,
                'conversations' => 1,
            ],
        ]);

        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $carol = User::factory()->create();

        // Bob initiates chat with Alice
        Sanctum::actingAs($bob);
        $convId = $this->postJson('/api/v1/conversations', ['user_id' => $alice->id])->assertOk()->json('data.id');
        $this->postJson("/api/v1/conversations/{$convId}/messages", ['body' => 'سلام'])->assertCreated();

        // Alice replies to Bob -> does NOT consume Alice's starter quota
        Sanctum::actingAs($alice);
        $this->postJson("/api/v1/conversations/{$convId}/messages", ['body' => 'علیک سلام'])->assertCreated();

        // Alice starts 1st conversation with Carol -> allowed
        $conv2Id = $this->postJson('/api/v1/conversations', ['user_id' => $carol->id])->assertOk()->json('data.id');
        $this->postJson("/api/v1/conversations/{$conv2Id}/messages", ['body' => 'سلام کارول'])->assertCreated();

        // Alice tries to start a group -> 402
        $this->postJson('/api/v1/conversations/groups', [
            'title' => 'گروه تست',
            'user_ids' => [$bob->id],
        ])->assertStatus(402)->assertJsonPath('quota.key', 'conversations');
    }

    public function test_pro_staff_and_disabled_limits_are_exempt(): void
    {
        AppSettings::setMany([
            'limits_enabled' => true,
            'free_quotas' => ['posts' => 1, 'stories' => 1, 'topics' => 1, 'comments' => 1, 'conversations' => 1],
        ]);

        $pro = User::factory()->pro()->create();
        Sanctum::actingAs($pro);
        $this->postJson('/api/v1/posts', ['body' => '۱'])->assertCreated();
        $this->postJson('/api/v1/posts', ['body' => '۲'])->assertCreated();

        $staff = User::factory()->create(['staff_role' => 'moderator']);
        Sanctum::actingAs($staff);
        $this->postJson('/api/v1/posts', ['body' => '۱'])->assertCreated();
        $this->postJson('/api/v1/posts', ['body' => '۲'])->assertCreated();

        $free = User::factory()->create();
        Post::query()->create(['user_id' => $free->id, 'type' => 'text', 'body' => 'قبلی']);
        AppSettings::set('limits_enabled', false);

        Sanctum::actingAs($free);
        $this->postJson('/api/v1/posts', ['body' => 'بعد از خاموش کردن سقف'])->assertCreated();
    }
}
