<?php

namespace App\Filament\Widgets;

use Carbon\CarbonPeriod;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\DB;

class ActivityChart extends ChartWidget
{
    protected static ?int $sort = 2;

    protected int|string|array $columnSpan = [
        'md' => 2,
        'xl' => 8,
    ];

    protected ?string $heading = 'روند عضویت و انتشار محتوا (۳۰ روز اخیر)';

    protected ?string $description = 'مقایسه روزانه اعضای جدید و پست‌های منتشرشده در شبکه';

    protected ?string $maxHeight = '280px';

    protected function getType(): string
    {
        return 'line';
    }

    protected function getData(): array
    {
        $start = now()->subDays(29)->startOfDay();
        $end = now()->startOfDay();

        $users = DB::table('users')
            ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
            ->where('created_at', '>=', $start)
            ->groupBy('day')
            ->pluck('total', 'day');

        $posts = DB::table('posts')
            ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
            ->whereNull('removed_at')
            ->where('created_at', '>=', $start)
            ->groupBy('day')
            ->pluck('total', 'day');

        $labels = [];
        $userSeries = [];
        $postSeries = [];

        foreach (CarbonPeriod::create($start, $end) as $date) {
            $key = $date->format('Y-m-d');
            $labels[] = $date->format('m/d');
            $userSeries[] = (int) ($users[$key] ?? 0);
            $postSeries[] = (int) ($posts[$key] ?? 0);
        }

        return [
            'datasets' => [
                [
                    'label' => 'اعضای جدید',
                    'data' => $userSeries,
                    'borderColor' => '#2F6FED',
                    'backgroundColor' => 'rgba(47, 111, 237, 0.14)',
                    'fill' => true,
                    'tension' => 0.35,
                ],
                [
                    'label' => 'پست‌های جدید',
                    'data' => $postSeries,
                    'borderColor' => '#12A8A8',
                    'backgroundColor' => 'rgba(18, 168, 168, 0.12)',
                    'fill' => true,
                    'tension' => 0.35,
                ],
            ],
            'labels' => $labels,
        ];
    }
}
