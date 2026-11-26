<?php

namespace Tests\Feature;

use App\Filament\Pages\MembershipSettings;
use App\Filament\Widgets\ActivityChart;
use App\Filament\Widgets\OpenReportsTable;
use App\Filament\Widgets\PendingVerificationsTable;
use App\Filament\Widgets\RolesChart;
use App\Filament\Widgets\TebyarOverview;
use App\Models\User;
use App\Support\AppSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_load_dashboard_with_styled_assets_and_widgets(): void
    {
        $admin = User::factory()->create(['staff_role' => 'admin']);

        $response = $this->actingAs($admin)
            ->get('/admin')
            ->assertOk();

        $response->assertSee('css/filament/filament/app.css', false);
        $response->assertSee('css/tebyar-admin.css', false);
        $response->assertSee('سلام '.$admin->name, false);
        $response->assertSee('ActivityChart', false);
        $response->assertSee('RolesChart', false);
        $response->assertSee('PendingVerificationsTable', false);
        $response->assertSee('OpenReportsTable', false);

        $this->actingAs($admin);
        Livewire::test(TebyarOverview::class)->assertSee('کل اعضا');
        Livewire::test(ActivityChart::class)->assertSee('روند عضویت و انتشار محتوا');
        Livewire::test(RolesChart::class)->assertSee('ترکیب نقش اعضای شبکه');
        Livewire::test(PendingVerificationsTable::class)->assertSee('صف احراز هویت‌های منتظر');
        Livewire::test(OpenReportsTable::class)->assertSee('گزارش‌های باز نظارت');
    }

    public function test_moderator_can_load_dashboard_without_forbidden_verification_queue(): void
    {
        $moderator = User::factory()->create(['staff_role' => 'moderator']);

        $this->actingAs($moderator)
            ->get('/admin')
            ->assertOk()
            ->assertSee('OpenReportsTable', false)
            ->assertDontSee('PendingVerificationsTable', false);

        $this->assertFalse(PendingVerificationsTable::canView());
        $this->assertTrue(OpenReportsTable::canView());
    }

    public function test_regular_member_cannot_access_admin_panel(): void
    {
        $member = User::factory()->create(['staff_role' => null]);

        $this->actingAs($member)
            ->get('/admin')
            ->assertForbidden();
    }

    public function test_admin_can_update_membership_settings_page(): void
    {
        $admin = User::factory()->create(['staff_role' => 'admin']);

        $this->actingAs($admin);

        $this->get('/admin/membership-settings')
            ->assertOk()
            ->assertSee('تنظیمات اشتراک و سقف‌های رایگان', false);

        $this->get('/admin/subscriptions')
            ->assertOk()
            ->assertSee('اشتراک‌های پرو', false);

        Livewire::test(MembershipSettings::class)
            ->assertOk()
            ->set('data.free_quotas.topics', 4)
            ->set('data.limits_enabled', false)
            ->call('save')
            ->assertHasNoErrors();

        $this->assertFalse(AppSettings::limitsEnabled());
        $this->assertSame(4, AppSettings::freeQuotas()['topics']);
    }
}
