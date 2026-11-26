<?php

namespace App\Filament\Pages;

use Filament\Pages\Dashboard as BaseDashboard;
use Illuminate\Contracts\View\View;

class Dashboard extends BaseDashboard
{
    protected static ?string $navigationLabel = 'داشبورد';

    protected static ?string $title = 'داشبورد مدیریت طبیار';

    public function getColumns(): int|array
    {
        return [
            'default' => 1,
            'md' => 2,
            'xl' => 12,
        ];
    }

    public function getHeader(): ?View
    {
        return view('filament.dashboard-header');
    }
}
