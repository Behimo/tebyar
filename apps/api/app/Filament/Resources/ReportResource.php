<?php

namespace App\Filament\Resources;

use App\Filament\Access;
use App\Filament\Labels;
use App\Filament\Resources\ReportResource\Pages\ListReports;
use App\Models\Report;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\ModerationService;
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

class ReportResource extends Resource
{
    protected static ?string $model = Report::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedFlag;

    protected static string|UnitEnum|null $navigationGroup = 'نظارت';

    protected static ?int $navigationSort = 1;

    protected static ?string $navigationLabel = 'گزارش‌ها';

    protected static ?string $modelLabel = 'گزارش';

    protected static ?string $pluralModelLabel = 'گزارش‌ها';

    public static function canViewAny(): bool
    {
        return Access::allows(['admin', 'moderator']);
    }

    public static function getNavigationBadge(): ?string
    {
        $count = Report::query()->where('status', 'open')->count();

        return $count > 0 ? (string) $count : null;
    }

    public static function getNavigationBadgeColor(): ?string
    {
        return 'danger';
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->components([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('created_at', 'desc')
            ->emptyStateHeading('گزارشی ثبت نشده است')
            ->emptyStateDescription('در حال حاضر هیچ گزارش تخلفی وجود ندارد.')
            ->emptyStateIcon(Heroicon::OutlinedShieldCheck)
            ->columns([
                TextColumn::make('reporter.name')
                    ->label('گزارش‌دهنده')
                    ->searchable()
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
                    ->color('warning'),
                TextColumn::make('details')
                    ->label('شرح')
                    ->limit(40)
                    ->placeholder('—'),
                TextColumn::make('status')
                    ->label('وضعیت')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => Labels::reportStatus($state))
                    ->color(fn (?string $state): string => Labels::reportStatusColor($state)),
                TextColumn::make('created_at')
                    ->label('زمان')
                    ->since()
                    ->sortable(),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->label('وضعیت')
                    ->options([
                        'open' => 'باز',
                        'resolved' => 'رسیدگی‌شده',
                        'dismissed' => 'ردشده',
                    ]),
            ])
            ->recordActions([
                Action::make('hide')
                    ->label('مخفی کردن')
                    ->icon(Heroicon::OutlinedEyeSlash)
                    ->color('danger')
                    ->requiresConfirmation()
                    ->visible(fn (Report $record): bool => Access::allows(['admin', 'moderator']) && $record->status === 'open')
                    ->action(function (Report $record): void {
                        $subject = $record->reportable;
                        if ($subject && isset($subject->hidden_at)) {
                            app(ModerationService::class)->hide($subject, auth()->user());
                        }
                        $record->forceFill(['status' => 'resolved', 'handled_by' => auth()->id()])->save();
                    }),
                Action::make('dismiss')
                    ->label('رد گزارش')
                    ->icon(Heroicon::OutlinedXCircle)
                    ->color('gray')
                    ->requiresConfirmation()
                    ->visible(fn (Report $record): bool => $record->status === 'open')
                    ->action(function (Report $record): void {
                        $record->forceFill(['status' => 'dismissed', 'handled_by' => auth()->id()])->save();
                        AuditLogger::record(auth()->user(), 'report.dismissed', $record);
                    }),
                Action::make('warn')
                    ->label('اخطار')
                    ->icon(Heroicon::OutlinedExclamationTriangle)
                    ->color('warning')
                    ->visible(fn (Report $record): bool => $record->status === 'open')
                    ->schema([Textarea::make('note')->label('متن اخطار')->required()])
                    ->action(function (Report $record, array $data): void {
                        $subject = $record->reportable;
                        $target = $subject instanceof User ? $subject : ($subject->user ?? $subject->author ?? null);
                        if ($target instanceof User) {
                            app(ModerationService::class)->warn($target, auth()->user(), $data['note']);
                        }
                        $record->forceFill(['status' => 'resolved', 'handled_by' => auth()->id()])->save();
                    }),
            ]);
    }

    public static function getPages(): array
    {
        return ['index' => ListReports::route('/')];
    }
}
