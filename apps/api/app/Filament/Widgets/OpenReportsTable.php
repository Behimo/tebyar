<?php

namespace App\Filament\Widgets;

use App\Filament\Access;
use App\Filament\Labels;
use App\Filament\Resources\ReportResource;
use App\Models\Report;
use Filament\Actions\Action;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget;

class OpenReportsTable extends TableWidget
{
    protected static ?int $sort = 5;

    protected int|string|array $columnSpan = [
        'md' => 2,
        'xl' => 6,
    ];

    public static function canView(): bool
    {
        return Access::allows(['admin', 'moderator']);
    }

    public function table(Table $table): Table
    {
        return $table
            ->heading('گزارش‌های باز نظارت')
            ->description('موارد گزارش‌شده نیازمند بررسی ناظر یا ادمین')
            ->query(
                Report::query()
                    ->with('reporter')
                    ->where('status', 'open')
                    ->latest()
                    ->limit(6),
            )
            ->paginated(false)
            ->emptyStateHeading('گزارش بازی وجود ندارد')
            ->emptyStateDescription('مورد گزارش‌شده‌ای در صف بررسی نیست.')
            ->emptyStateIcon(Heroicon::OutlinedShieldCheck)
            ->columns([
                TextColumn::make('reporter.name')
                    ->label('گزارش‌دهنده')
                    ->weight('bold'),
                TextColumn::make('reportable_type')
                    ->label('موضوع')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => Labels::reportableType($state))
                    ->color('gray'),
                TextColumn::make('reason')
                    ->label('دلیل')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => Labels::reportReason($state))
                    ->color('danger'),
                TextColumn::make('created_at')
                    ->label('زمان')
                    ->since(),
            ])
            ->headerActions([
                Action::make('open_reports')
                    ->label('مدیریت گزارش‌ها')
                    ->url(ReportResource::getUrl())
                    ->color('gray')
                    ->size('sm'),
            ])
            ->recordActions([
                Action::make('review')
                    ->label('بررسی')
                    ->icon(Heroicon::OutlinedArrowTopRightOnSquare)
                    ->url(fn (): string => ReportResource::getUrl()),
            ]);
    }
}
