<?php

namespace App\Filament\Widgets;

use App\Filament\Access;
use App\Models\Post;
use App\Models\Report;
use App\Models\SupportTicket;
use App\Models\User;
use App\Models\Vacancy;
use App\Models\VerificationRequest;
use Carbon\CarbonPeriod;
use Filament\Support\Icons\Heroicon;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Facades\DB;

class TebyarOverview extends StatsOverviewWidget
{
    protected static ?int $sort = 1;

    protected int|string|array $columnSpan = 'full';

    protected function getStats(): array
    {
        $totalUsers = User::query()->count();
        $usersThisWeek = User::query()->where('created_at', '>=', now()->subDays(7))->count();
        $usersPrevWeek = User::query()
            ->where('created_at', '>=', now()->subDays(14))
            ->where('created_at', '<', now()->subDays(7))
            ->count();

        $totalPosts = Post::query()->visible()->count();
        $postsThisWeek = Post::query()->visible()->where('created_at', '>=', now()->subDays(7))->count();

        $stats = [
            Stat::make('کل اعضا', number_format($totalUsers))
                ->description("{$usersThisWeek} عضو جدید در ۷ روز اخیر")
                ->descriptionIcon($usersThisWeek >= $usersPrevWeek ? Heroicon::OutlinedArrowTrendingUp : Heroicon::OutlinedArrowTrendingDown)
                ->color('primary')
                ->icon(Heroicon::OutlinedUsers)
                ->chart($this->dailyCounts('users')),

            Stat::make('پست‌های منتشرشده', number_format($totalPosts))
                ->description("{$postsThisWeek} پست در هفته گذشته")
                ->descriptionIcon(Heroicon::OutlinedSparkles)
                ->color('info')
                ->icon(Heroicon::OutlinedNewspaper)
                ->chart($this->dailyCounts('posts')),
        ];

        if (Access::allows(['admin', 'support'])) {
            $pendingVerifications = VerificationRequest::query()->where('status', 'pending')->count();
            $stats[] = Stat::make('منتظر احراز هویت', number_format($pendingVerifications))
                ->description($pendingVerifications > 0 ? 'نیازمند بررسی ادمین' : 'همه درخواست‌ها بررسی شده‌اند')
                ->descriptionIcon(Heroicon::OutlinedShieldCheck)
                ->color($pendingVerifications > 0 ? 'warning' : 'success')
                ->icon(Heroicon::OutlinedIdentification)
                ->chart($this->dailyCounts('verification_requests'));
        }

        if (Access::allows(['admin', 'moderator'])) {
            $openReports = Report::query()->where('status', 'open')->count();
            $stats[] = Stat::make('گزارش‌های باز', number_format($openReports))
                ->description($openReports > 0 ? 'منتظر بررسی ناظر' : 'صف نظارت پاک است')
                ->descriptionIcon(Heroicon::OutlinedFlag)
                ->color($openReports > 0 ? 'danger' : 'success')
                ->icon(Heroicon::OutlinedExclamationTriangle)
                ->chart($this->dailyCounts('reports'));
        }

        if (Access::allows(['admin', 'support'])) {
            $openTickets = SupportTicket::query()->where('status', 'open')->count();
            $stats[] = Stat::make('تیکت‌های باز پشتیبانی', number_format($openTickets))
                ->description('پیام‌های نیازمند پاسخ')
                ->descriptionIcon(Heroicon::OutlinedChatBubbleLeftRight)
                ->color($openTickets > 0 ? 'warning' : 'success')
                ->icon(Heroicon::OutlinedLifebuoy)
                ->chart($this->dailyCounts('support_tickets'));
        }

        if (Access::allows(['admin', 'moderator'])) {
            $activeVacancies = Vacancy::query()->where('status', 'published')->whereNull('hidden_at')->count();
            $stats[] = Stat::make('آگهی‌های فعال', number_format($activeVacancies))
                ->description('فرصت‌های شغلی منتشرشده')
                ->descriptionIcon(Heroicon::OutlinedBriefcase)
                ->color('success')
                ->icon(Heroicon::OutlinedBriefcase)
                ->chart($this->dailyCounts('vacancies'));
        }

        return $stats;
    }

    /**
     * @return array<int, int>
     */
    private function dailyCounts(string $table): array
    {
        $start = now()->subDays(6)->startOfDay();
        $rows = DB::table($table)
            ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
            ->where('created_at', '>=', $start)
            ->groupBy('day')
            ->pluck('total', 'day');

        $series = [];
        foreach (CarbonPeriod::create($start, now()->startOfDay()) as $date) {
            $series[] = (int) ($rows[$date->format('Y-m-d')] ?? 0);
        }

        return $series;
    }
}
