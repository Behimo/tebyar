<?php

namespace App\Providers\Filament;

use App\Filament\Pages\Dashboard;
use App\Filament\Pages\MembershipSettings;
use App\Filament\Widgets\ActivityChart;
use App\Filament\Widgets\OpenReportsTable;
use App\Filament\Widgets\PendingVerificationsTable;
use App\Filament\Widgets\RolesChart;
use App\Filament\Widgets\TebyarOverview;
use Filament\FontProviders\LocalFontProvider;
use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\AuthenticateSession;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Navigation\NavigationGroup;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Colors\Color;
use Filament\Support\Enums\Width;
use Filament\View\PanelsRenderHook;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->default()
            ->id('admin')
            ->path('admin')
            ->login()
            ->brandName('طبیار')
            ->brandLogo(fn () => view('filament.brand-logo'))
            ->brandLogoHeight('2.25rem')
            ->favicon(asset('favicon.svg'))
            ->font('Vazirmatn', provider: LocalFontProvider::class)
            ->colors([
                'primary' => Color::hex('#2F6FED'),
                'info' => Color::hex('#12A8A8'),
                'success' => Color::hex('#188657'),
                'warning' => Color::hex('#D97706'),
                'danger' => Color::hex('#C33939'),
                'gray' => Color::Slate,
            ])
            ->sidebarCollapsibleOnDesktop()
            ->maxContentWidth(Width::Full)
            ->navigationGroups([
                NavigationGroup::make('احراز و اعضا'),
                NavigationGroup::make('محتوا'),
                NavigationGroup::make('نظارت'),
                NavigationGroup::make('پشتیبانی'),
                NavigationGroup::make('سیستم'),
            ])
            ->discoverResources(in: app_path('Filament/Resources'), for: 'App\\Filament\\Resources')
            ->pages([
                Dashboard::class,
                MembershipSettings::class,
            ])
            ->widgets([
                TebyarOverview::class,
                ActivityChart::class,
                RolesChart::class,
                PendingVerificationsTable::class,
                OpenReportsTable::class,
            ])
            ->middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                AuthenticateSession::class,
                ShareErrorsFromSession::class,
                PreventRequestForgery::class,
                SubstituteBindings::class,
                DisableBladeIconComponents::class,
                DispatchServingFilamentEvent::class,
            ])
            ->authMiddleware([
                Authenticate::class,
            ])
            ->renderHook(PanelsRenderHook::HEAD_START, fn () => <<<'HTML'
                <script>document.documentElement.setAttribute('dir','rtl');document.documentElement.lang='fa';</script>
            HTML)
            ->renderHook(PanelsRenderHook::STYLES_AFTER, fn () => '<link rel="stylesheet" href="'.asset('css/tebyar-admin.css').'?v='.@filemtime(public_path('css/tebyar-admin.css')).'" />');
    }
}
