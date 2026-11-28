<?php

namespace Tests\Feature;

use App\Models\Community;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RoleTiersTest extends TestCase
{
    use RefreshDatabase;

    private function community(): Community
    {
        return Community::query()->create([
            'name' => 'سلامت عمومی',
            'slug' => 'public-health',
            'specialty' => 'سلامت',
            'description' => 'آزمایش',
        ]);
    }

    public function test_public_and_student_signup_auto_verified_without_verification_request(): void
    {
        foreach (['public', 'student'] as $role) {
            $user = User::factory()->create(['role' => null, 'account_status' => 'pending_review']);
            Sanctum::actingAs($user);

            $payload = $this->postJson('/api/v1/me/onboarding', [
                'role' => $role,
                'name' => 'کاربر آزمایشی',
            ])->assertOk()->json('data');

            $this->assertSame('verified', $payload['account_status']);
            $this->assertSame($role, $payload['role']);
            $this->assertSame('restricted', $payload['tier']);
            $this->assertDatabaseMissing('verification_requests', ['user_id' => $user->id]);
        }
    }

    public function test_nurse_signup_requires_council_code_and_goes_to_review(): void
    {
        $user = User::factory()->create(['role' => null, 'account_status' => 'pending_review']);
        Sanctum::actingAs($user);

        $this->postJson('/api/v1/me/onboarding', [
            'role' => 'nurse',
            'name' => 'پرستار آزمایشی',
        ])->assertStatus(422);

        $payload = $this->postJson('/api/v1/me/onboarding', [
            'role' => 'nurse',
            'name' => 'پرستار آزمایشی',
            'medical_council_number' => '123456',
        ])->assertOk()->json('data');

        $this->assertSame('pending_review', $payload['account_status']);
        $this->assertDatabaseHas('verification_requests', ['user_id' => $user->id, 'type' => 'license']);
    }

    public function test_restricted_user_cannot_use_professional_features_but_can_interact(): void
    {
        $restricted = User::factory()->restricted('public')->create();
        $doctor = User::factory()->create();
        $post = $doctor->posts()->create(['type' => 'text', 'body' => 'پست آزمایشی']);

        Sanctum::actingAs($restricted);

        $this->postJson('/api/v1/posts', ['body' => 'سلام'])->assertForbidden();
        $this->postJson('/api/v1/conversations', ['user_id' => $doctor->id])->assertForbidden();
        $this->getJson('/api/v1/jobs')->assertForbidden();
        $this->getJson('/api/v1/subscription')->assertForbidden();
        $this->getJson('/api/v1/me/insights')->assertForbidden();

        $this->postJson('/api/v1/posts/'.$post->id.'/reactions')->assertOk();
        $this->postJson('/api/v1/posts/'.$post->id.'/comments', ['body' => 'نظر'])->assertCreated();
        $this->postJson('/api/v1/posts/'.$post->id.'/repost')->assertCreated();
        $this->postJson('/api/v1/posts/'.$post->id.'/bookmark')->assertOk();
        $this->postJson('/api/v1/doctors/'.$doctor->id.'/follow')->assertOk();
    }

    public function test_restricted_user_can_only_ask_questions_with_daily_cap(): void
    {
        config(['tebyar.restricted_daily_quotas' => ['topics' => 3, 'comments' => 30]]);
        $community = $this->community();
        $restricted = User::factory()->restricted('student')->create();
        Sanctum::actingAs($restricted);

        foreach (['discussion', 'case', 'poll'] as $kind) {
            $this->postJson('/api/v1/communities/'.$community->slug.'/topics', [
                'kind' => $kind,
                'title' => 'موضوع',
                'body' => 'متن',
                'disclaimer_accepted' => true,
            ])->assertForbidden();
        }

        for ($i = 1; $i <= 3; $i++) {
            $this->postJson('/api/v1/communities/'.$community->slug.'/topics', [
                'kind' => 'question',
                'title' => "سؤال {$i}",
                'body' => 'متن سؤال',
            ])->assertCreated();
        }

        $this->postJson('/api/v1/communities/'.$community->slug.'/topics', [
            'kind' => 'question',
            'title' => 'سؤال چهارم',
            'body' => 'متن',
        ])->assertStatus(429)->assertJsonPath('code', 'daily_limit');

        $this->travel(1)->days();

        $this->postJson('/api/v1/communities/'.$community->slug.'/topics', [
            'kind' => 'question',
            'title' => 'سؤال فردا',
            'body' => 'متن',
        ])->assertCreated();
    }

    public function test_restricted_user_audience_input_is_ignored(): void
    {
        $community = $this->community();
        $restricted = User::factory()->restricted('public')->create();
        Sanctum::actingAs($restricted);

        $topic = $this->postJson('/api/v1/communities/'.$community->slug.'/topics', [
            'kind' => 'question',
            'title' => 'سؤال',
            'body' => 'متن',
            'audience' => ['physician'],
        ])->assertCreated()->json('data');

        $this->assertNull($topic['audience']);
    }

    public function test_physician_only_post_hidden_from_other_groups(): void
    {
        $doctor = User::factory()->professional('general')->create();
        $nurse = User::factory()->professional('nurse')->create();
        $public = User::factory()->restricted('public')->create();
        $otherDoctor = User::factory()->professional('specialist')->create();

        Sanctum::actingAs($doctor);
        $created = $this->postJson('/api/v1/posts', [
            'body' => 'پست تخصصی پزشکان',
            'audience' => ['physician'],
        ])->assertCreated()->json('data');
        $this->assertSame(['physician'], $created['audience']);
        $postId = $created['id'];

        Sanctum::actingAs($nurse);
        $this->getJson('/api/v1/posts/'.$postId)->assertNotFound();
        $this->postJson('/api/v1/posts/'.$postId.'/comments', ['body' => 'نظر'])->assertNotFound();
        $feed = $this->getJson('/api/v1/feed')->assertOk()->json('data');
        $this->assertEmpty(collect($feed)->where('id', $postId)->all());

        Sanctum::actingAs($public);
        $this->getJson('/api/v1/posts/'.$postId)->assertNotFound();

        Sanctum::actingAs($otherDoctor);
        $this->getJson('/api/v1/posts/'.$postId)->assertOk();
        $feed = $this->getJson('/api/v1/feed')->assertOk()->json('data');
        $this->assertNotEmpty(collect($feed)->where('id', $postId)->all());

        Sanctum::actingAs($doctor);
        $this->getJson('/api/v1/posts/'.$postId)->assertOk();
    }

    public function test_repost_inherits_original_audience(): void
    {
        $doctor = User::factory()->professional('general')->create();
        $public = User::factory()->restricted('public')->create();

        Sanctum::actingAs($doctor);
        $post = $doctor->posts()->create(['type' => 'text', 'body' => 'پست', 'audience' => ['physician']]);

        $reposter = User::factory()->professional('specialist')->create();
        Sanctum::actingAs($reposter);
        $repost = $this->postJson('/api/v1/posts/'.$post->id.'/repost')->assertCreated()->json('data');
        $this->assertSame(['physician'], $repost['audience']);

        Sanctum::actingAs($public);
        $this->getJson('/api/v1/posts/'.$repost['id'])->assertNotFound();
    }

    public function test_audience_restricted_topic_hidden_in_community_and_page(): void
    {
        $community = $this->community();
        $doctor = User::factory()->professional('general')->create();
        $public = User::factory()->restricted('public')->create();

        Sanctum::actingAs($doctor);
        $topic = $this->postJson('/api/v1/communities/'.$community->slug.'/topics', [
            'kind' => 'discussion',
            'title' => 'بحث پزشکان',
            'body' => 'متن',
            'audience' => ['physician', 'resident'],
        ])->assertCreated()->json('data');

        Sanctum::actingAs($public);
        $this->getJson('/api/v1/topics/'.$topic['id'])->assertNotFound();
        $this->postJson('/api/v1/topics/'.$topic['id'].'/replies', ['body' => 'پاسخ'])->assertNotFound();
        $list = $this->getJson('/api/v1/communities/'.$community->slug)->assertOk()->json('topics');
        $this->assertEmpty(collect($list)->where('id', $topic['id'])->all());

        Sanctum::actingAs($doctor);
        $this->getJson('/api/v1/topics/'.$topic['id'])->assertOk();
    }

    public function test_restricted_user_can_reply_in_forum(): void
    {
        $community = $this->community();
        $doctor = User::factory()->create();
        $topic = $community->topics()->create([
            'user_id' => $doctor->id,
            'kind' => 'question',
            'title' => 'سؤال',
            'body' => 'متن',
        ]);

        $restricted = User::factory()->restricted('student')->create();
        Sanctum::actingAs($restricted);
        $this->postJson('/api/v1/topics/'.$topic->id.'/replies', ['body' => 'پاسخ من'])->assertCreated();
    }

    public function test_community_slug_auto_generated_for_persian_names(): void
    {
        $community = Community::query()->create([
            'name' => 'انجمن قلب و عروق',
            'specialty' => 'قلب',
            'description' => 'توضیح',
        ]);

        $this->assertNotEmpty($community->slug);
        $this->assertMatchesRegularExpression('/^[a-z0-9-]+$/', $community->slug);
    }

    public function test_professional_me_payload_has_permissions(): void
    {
        $doctor = User::factory()->professional('pharmacist')->create();
        Sanctum::actingAs($doctor);

        $payload = $this->getJson('/api/v1/me')->assertOk()->json('data');

        $this->assertSame('professional', $payload['tier']);
        $this->assertTrue($payload['permissions']['post']);
        $this->assertTrue($payload['permissions']['message']);
        $this->assertTrue($payload['permissions']['audience']);
        $this->assertNotEmpty($payload['audience_groups']);

        $restricted = User::factory()->restricted('public')->create();
        Sanctum::actingAs($restricted);
        $payload = $this->getJson('/api/v1/me')->assertOk()->json('data');

        $this->assertSame('restricted', $payload['tier']);
        $this->assertFalse($payload['permissions']['post']);
        $this->assertFalse($payload['permissions']['message']);
        $this->assertTrue($payload['permissions']['ask']);
        $this->assertSame('daily', $payload['quotas']['period']);
    }
}
