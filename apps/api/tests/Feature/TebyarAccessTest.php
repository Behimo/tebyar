<?php

namespace Tests\Feature;

use App\Models\Community;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TebyarAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_otp_login_does_not_expose_identity_fields(): void
    {
        $code = $this->postJson('/api/v1/auth/otp', ['phone' => '09123334444'])
            ->assertOk()
            ->json('debug_code');

        $this->assertNotEmpty($code);

        $payload = $this->postJson('/api/v1/auth/verify', [
            'phone' => '09123334444',
            'code' => $code,
        ])->assertOk()->json('user');

        $this->assertSame('pending_review', $payload['account_status']);
        $this->assertArrayNotHasKey('medical_council_number', $payload);
        $this->assertArrayNotHasKey('national_id', $payload);
    }

    public function test_pending_member_cannot_open_the_feed(): void
    {
        $user = User::factory()->create(['account_status' => 'pending_review', 'role' => 'student']);
        Sanctum::actingAs($user);

        $this->getJson('/api/v1/feed')->assertForbidden();
    }

    public function test_student_cannot_publish_a_case_but_a_licensed_doctor_can(): void
    {
        $community = Community::query()->create([
            'name' => 'قلب',
            'slug' => 'heart',
            'specialty' => 'قلب',
            'description' => 'آزمایش',
        ]);

        $student = User::factory()->create([
            'role' => 'student',
            'license_verified_at' => null,
            'identity_verified_at' => null,
            'education_verified_at' => now(),
        ]);

        Sanctum::actingAs($student);
        $this->postJson('/api/v1/communities/heart/topics', [
            'kind' => 'case',
            'title' => 'کیس آزمایشی',
            'body' => 'شرح بدون شناسه',
            'disclaimer_accepted' => true,
            'anonymous' => true,
        ])->assertForbidden();

        $doctor = User::factory()->create();
        $doctor->identity()->create([
            'medical_council_number' => '998877',
            'national_id' => null,
        ]);

        Sanctum::actingAs($doctor);
        $this->postJson('/api/v1/communities/heart/topics', [
            'kind' => 'case',
            'title' => 'درد قفسه سینه',
            'body' => 'شماره بیمار 09124567890',
            'disclaimer_accepted' => true,
            'anonymous' => true,
        ])->assertStatus(422);

        $created = $this->postJson('/api/v1/communities/heart/topics', [
            'kind' => 'case',
            'title' => 'درد قفسه سینه',
            'body' => 'کیس ساختگی بدون شناسه هویتی.',
            'disclaimer_accepted' => true,
            'anonymous' => true,
        ])->assertCreated()->json('data');

        $viewer = User::factory()->create();
        Sanctum::actingAs($viewer);
        $shown = $this->getJson('/api/v1/topics/'.$created['id'])->assertOk()->json();

        $this->assertTrue($shown['data']['author']['anonymous']);
        $this->assertStringNotContainsString('998877', json_encode($shown));
        $this->assertStringNotContainsString($doctor->phone, json_encode($shown));
    }

    public function test_public_doctor_profile_hides_phone(): void
    {
        $doctor = User::factory()->create(['slug' => 'rezaei', 'phone' => '09129998877']);
        $doctor->identity()->create(['medical_council_number' => '445566']);
        Sanctum::actingAs(User::factory()->create());

        $response = $this->getJson('/api/v1/doctors/rezaei')->assertOk();
        $this->assertStringNotContainsString('09129998877', $response->getContent());
        $this->assertStringNotContainsString('445566', $response->getContent());
    }
}
