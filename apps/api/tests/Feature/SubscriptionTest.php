<?php

namespace Tests\Feature;

use App\Models\Subscription;
use App\Models\User;
use App\Services\SubscriptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SubscriptionTest extends TestCase
{
    use RefreshDatabase;

    public function test_member_can_request_upgrade_and_admin_can_activate_it(): void
    {
        $user = User::factory()->create(['pro_until' => null]);
        $admin = User::factory()->create(['staff_role' => 'admin']);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/subscription')
            ->assertOk()
            ->assertJsonPath('data.is_pro', false)
            ->assertJsonCount(2, 'data.plans');

        $created = $this->postJson('/api/v1/subscription/requests', [
            'plan' => 'pro_1m',
            'reference' => 'TRX-12345',
        ])->assertCreated()->json('data');

        $this->assertSame('pending', $created['status']);

        // Second pending request is blocked
        $this->postJson('/api/v1/subscription/requests', [
            'plan' => 'pro_1y',
        ])->assertStatus(422);

        $sub = Subscription::query()->findOrFail($created['id']);
        app(SubscriptionService::class)->activate($sub, $admin, 'تایید شد');

        $user->refresh();
        $this->assertTrue($user->isPro());
        $this->assertTrue($user->pro_until->isFuture());
        $this->assertSame('active', $sub->fresh()->status);

        $this->getJson('/api/v1/me')
            ->assertOk()
            ->assertJsonPath('data.is_pro', true);

        $this->assertSame(1, $user->notifications()->count());
    }

    public function test_admin_can_reject_subscription_request(): void
    {
        $user = User::factory()->create(['pro_until' => null]);
        $admin = User::factory()->create(['staff_role' => 'admin']);
        $sub = Subscription::factory()->for($user)->create();

        app(SubscriptionService::class)->reject($sub, $admin, 'کد پیگیری نامعتبر');

        $this->assertSame('rejected', $sub->fresh()->status);
        $this->assertFalse($user->fresh()->isPro());
    }
}
