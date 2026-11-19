<?php

namespace App\Filament\Widgets;

use App\Models\Report;
use App\Models\SupportTicket;
use App\Models\User;
use App\Models\VerificationRequest;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class TebyarOverview extends StatsOverviewWidget
{
    protected function getStats(): array
    {
        return [
            Stat::make('منتظر احراز', VerificationRequest::query()->where('status', 'pending')->count()),
            Stat::make('گزارش باز', Report::query()->where('status', 'open')->count()),
            Stat::make('تیکت باز', SupportTicket::query()->where('status', 'open')->count()),
            Stat::make('عضو جدید امروز', User::query()->whereDate('created_at', today())->count()),
        ];
    }
}
