<?php

namespace App\Filament\Widgets;

use App\Filament\Access;
use App\Filament\Labels;
use App\Filament\Resources\VerificationRequestResource;
use App\Models\VerificationRequest;
use App\Services\VerificationService;
use Filament\Actions\Action;
use Filament\Forms\Components\Textarea;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget;

class PendingVerificationsTable extends TableWidget
{
    protected static ?int $sort = 4;

    protected int|string|array $columnSpan = [
        'md' => 2,
        'xl' => 6,
    ];

    public static function canView(): bool
    {
        return Access::allows(['admin', 'support']);
    }

    public function table(Table $table): Table
    {
        return $table
            ->heading('صف احراز هویت‌های منتظر')
            ->description('آخرین درخواست‌های در انتظار بررسی ادمین')
            ->query(
                VerificationRequest::query()
                    ->with('user')
                    ->where('status', 'pending')
                    ->latest()
                    ->limit(6),
            )
            ->paginated(false)
            ->emptyStateHeading('درخواست منتظری وجود ندارد')
            ->emptyStateDescription('همه درخواست‌های احراز هویت بررسی شده‌اند.')
            ->emptyStateIcon(Heroicon::OutlinedCheckBadge)
            ->columns([
                TextColumn::make('user.name')
                    ->label('عضو')
                    ->weight('bold'),
                TextColumn::make('type')
                    ->label('نوع')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => Labels::verificationType($state))
                    ->color('info'),
                TextColumn::make('created_at')
                    ->label('ثبت')
                    ->since()
                    ->tooltip(fn (VerificationRequest $record): string => $record->created_at?->format('Y-m-d H:i') ?? ''),
            ])
            ->headerActions([
                Action::make('all')
                    ->label('مشاهده همه')
                    ->url(VerificationRequestResource::getUrl())
                    ->color('gray')
                    ->size('sm'),
            ])
            ->recordActions([
                Action::make('approve')
                    ->label('تأیید')
                    ->icon(Heroicon::OutlinedCheckCircle)
                    ->color('success')
                    ->requiresConfirmation()
                    ->visible(fn (): bool => Access::allows(['admin']))
                    ->action(fn (VerificationRequest $record) => app(VerificationService::class)->decide($record, auth()->user(), 'approve')),
                Action::make('correction')
                    ->label('اصلاح')
                    ->icon(Heroicon::OutlinedPencilSquare)
                    ->color('warning')
                    ->visible(fn (): bool => Access::allows(['admin']))
                    ->schema([
                        Textarea::make('note')->label('توضیح برای عضو')->required(),
                    ])
                    ->action(fn (VerificationRequest $record, array $data) => app(VerificationService::class)->decide($record, auth()->user(), 'correction', $data['note'])),
            ]);
    }
}
