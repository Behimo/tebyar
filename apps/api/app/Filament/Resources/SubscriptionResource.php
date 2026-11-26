<?php

namespace App\Filament\Resources;

use App\Filament\Access;
use App\Filament\Labels;
use App\Filament\Resources\SubscriptionResource\Pages\ListSubscriptions;
use App\Models\Subscription;
use App\Services\SubscriptionService;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Forms\Components\Textarea;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use UnitEnum;

class SubscriptionResource extends Resource
{
    protected static ?string $model = Subscription::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedSparkles;

    protected static string|UnitEnum|null $navigationGroup = 'احراز و اعضا';

    protected static ?int $navigationSort = 3;

    protected static ?string $navigationLabel = 'اشتراک‌های پرو';

    protected static ?string $modelLabel = 'درخواست اشتراک';

    protected static ?string $pluralModelLabel = 'اشتراک‌های پرو';

    public static function canViewAny(): bool
    {
        return Access::allows(['admin', 'support']);
    }

    public static function getNavigationBadge(): ?string
    {
        $count = Subscription::query()->where('status', 'pending')->count();

        return $count > 0 ? (string) $count : null;
    }

    public static function getNavigationBadgeColor(): ?string
    {
        return 'warning';
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->components([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('created_at', 'desc')
            ->emptyStateHeading('درخواست اشتراکی ثبت نشده است')
            ->emptyStateIcon(Heroicon::OutlinedSparkles)
            ->columns([
                TextColumn::make('user.name')
                    ->label('عضو')
                    ->searchable()
                    ->weight('bold')
                    ->description(fn (Subscription $record): ?string => $record->user?->phone),
                TextColumn::make('plan')
                    ->label('طرح')
                    ->searchable(),
                TextColumn::make('months')
                    ->label('مدت')
                    ->formatStateUsing(fn (int $state): string => "{$state} ماه"),
                TextColumn::make('amount')
                    ->label('مبلغ')
                    ->formatStateUsing(fn (int $state): string => $state > 0 ? number_format($state).' تومان' : '—'),
                TextColumn::make('reference')
                    ->label('کد پیگیری')
                    ->placeholder('—')
                    ->searchable(),
                TextColumn::make('status')
                    ->label('وضعیت')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => Labels::subscriptionStatus($state))
                    ->color(fn (?string $state): string => Labels::subscriptionStatusColor($state)),
                TextColumn::make('ends_at')
                    ->label('پایان اعتبار')
                    ->date('Y-m-d')
                    ->placeholder('—'),
                TextColumn::make('created_at')
                    ->label('زمان ثبت')
                    ->since()
                    ->sortable(),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->label('وضعیت')
                    ->options([
                        'pending' => 'در انتظار بررسی',
                        'active' => 'فعال',
                        'rejected' => 'ردشده',
                        'cancelled' => 'لغوشده',
                    ]),
            ])
            ->recordActions([
                Action::make('activate')
                    ->label('فعال‌سازی')
                    ->icon(Heroicon::OutlinedCheckCircle)
                    ->color('success')
                    ->requiresConfirmation()
                    ->modalHeading('فعال‌سازی اشتراک پرو')
                    ->modalDescription('آیا از فعال‌سازی اشتراک طبیار پرو برای این عضو اطمینان دارید؟')
                    ->visible(fn (Subscription $record): bool => Access::allows(['admin']) && $record->status === 'pending')
                    ->schema([
                        Textarea::make('note')->label('یادداشت (اختیاری)'),
                    ])
                    ->action(function (Subscription $record, array $data): void {
                        app(SubscriptionService::class)->activate($record, auth()->user(), $data['note'] ?? null);
                    }),
                Action::make('reject')
                    ->label('رد')
                    ->icon(Heroicon::OutlinedXCircle)
                    ->color('danger')
                    ->visible(fn (Subscription $record): bool => Access::allows(['admin']) && $record->status === 'pending')
                    ->schema([
                        Textarea::make('note')->label('دلیل رد'),
                    ])
                    ->action(function (Subscription $record, array $data): void {
                        app(SubscriptionService::class)->reject($record, auth()->user(), $data['note'] ?? null);
                    }),
            ]);
    }

    public static function getPages(): array
    {
        return ['index' => ListSubscriptions::route('/')];
    }
}
