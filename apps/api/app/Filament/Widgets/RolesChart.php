<?php

namespace App\Filament\Widgets;

use App\Filament\Access;
use App\Filament\Labels;
use App\Models\User;
use Filament\Widgets\ChartWidget;

class RolesChart extends ChartWidget
{
    protected static ?int $sort = 3;

    protected int|string|array $columnSpan = [
        'md' => 2,
        'xl' => 4,
    ];

    protected ?string $heading = 'ترکیب نقش اعضای شبکه';

    protected ?string $description = 'توزیع پزشکان، دستیاران، دانشجویان و مراکز درمانی';

    protected ?string $maxHeight = '280px';

    public static function canView(): bool
    {
        return Access::allows(['admin', 'support', 'moderator']);
    }

    protected function getType(): string
    {
        return 'doughnut';
    }

    protected function getData(): array
    {
        $counts = User::query()
            ->selectRaw("COALESCE(role, 'unknown') as role_key, COUNT(*) as total")
            ->groupBy('role_key')
            ->pluck('total', 'role_key');

        $order = ['specialist', 'general', 'resident', 'pharmacist', 'nurse', 'veterinarian', 'intern', 'student', 'public', 'employer'];
        $palette = ['#2F6FED', '#12A8A8', '#7B5CDB', '#0EA5E9', '#F472B6', '#84CC16', '#FF8070', '#F59E0B', '#94A3B8', '#10B981'];

        $labels = [];
        $data = [];
        $colors = [];

        foreach ($order as $index => $role) {
            $value = (int) ($counts[$role] ?? 0);
            if ($value > 0) {
                $labels[] = Labels::userRole($role);
                $data[] = $value;
                $colors[] = $palette[$index];
            }
        }

        if ($data === []) {
            $labels = ['عضو'];
            $data = [0];
            $colors = ['#CBD5E1'];
        }

        return [
            'datasets' => [
                [
                    'data' => $data,
                    'backgroundColor' => $colors,
                    'borderWidth' => 0,
                ],
            ],
            'labels' => $labels,
        ];
    }
}
