<?php

namespace App\Filament\Resources;

use App\Filament\Access;
use App\Filament\Labels;
use App\Filament\Resources\VerificationRequestResource\Pages\ListVerificationRequests;
use App\Models\VerificationRequest;
use App\Services\VerificationService;
use App\Support\Present;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Forms\Components\Textarea;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use UnitEnum;

class VerificationRequestResource extends Resource
{
    protected static ?string $model = VerificationRequest::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedIdentification;

    protected static string|UnitEnum|null $navigationGroup = 'احراز و اعضا';

    protected static ?int $navigationSort = 1;

    protected static ?string $navigationLabel = 'احراز هویت';

    protected static ?string $modelLabel = 'درخواست احراز';

    protected static ?string $pluralModelLabel = 'درخواست‌های احراز';

    public static function canViewAny(): bool
    {
        return Access::allows(['admin', 'support']);
    }

    public static function getNavigationBadge(): ?string
    {
        $count = VerificationRequest::query()->where('status', 'pending')->count();

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
            ->emptyStateHeading('درخواست احراز هویتی ثبت نشده است')
            ->emptyStateDescription('درخواست‌های جدید پس از ثبت‌نام اعضا اینجا نمایش داده می‌شوند.')
            ->emptyStateIcon(Heroicon::OutlinedCheckBadge)
            ->columns([
                ImageColumn::make('avatar')
                    ->label('')
                    ->circular()
                    ->imageSize(36)
                    ->getStateUsing(fn (VerificationRequest $record): ?string => Present::publicUrl($record->user?->avatar_path)),
                TextColumn::make('user.name')
                    ->label('عضو')
                    ->searchable()
                    ->weight('bold')
                    ->description(fn (VerificationRequest $record): ?string => Labels::userRole($record->user?->role)),
                TextColumn::make('type')
                    ->label('نوع احراز')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => Labels::verificationType($state))
                    ->color('info'),
                TextColumn::make('status')
                    ->label('وضعیت')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => Labels::verificationStatus($state))
                    ->color(fn (?string $state): string => Labels::verificationStatusColor($state)),
                TextColumn::make('note')
                    ->label('یادداشت')
                    ->limit(36)
                    ->placeholder('—'),
                TextColumn::make('created_at')
                    ->label('زمان ثبت')
                    ->since()
                    ->tooltip(fn (VerificationRequest $record): string => $record->created_at?->format('Y-m-d H:i') ?? '')
                    ->sortable(),
                TextColumn::make('document')
                    ->label('مدرک')
                    ->badge()
                    ->color('gray')
                    ->icon(Heroicon::OutlinedDocumentArrowDown)
                    ->state('دانلود مدرک')
                    ->url(fn (VerificationRequest $record): string => route('staff.verification', $record))
                    ->openUrlInNewTab(),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->label('وضعیت')
                    ->options([
                        'pending' => 'در انتظار',
                        'approved' => 'تأییدشده',
                        'needs_correction' => 'نیازمند اصلاح',
                        'rejected' => 'ردشده',
                        'replaced' => 'جایگزین‌شده',
                    ]),
                SelectFilter::make('type')
                    ->label('نوع احراز')
                    ->options([
                        'education' => 'تحصیلی',
                        'license' => 'نظام پزشکی',
                        'specialty' => 'تخصص',
                        'organization' => 'مرکز درمانی',
                    ]),
            ])
            ->recordActions([
                Action::make('approve')
                    ->label('تأیید')
                    ->icon(Heroicon::OutlinedCheckCircle)
                    ->color('success')
                    ->requiresConfirmation()
                    ->modalHeading('تأیید درخواست احراز')
                    ->modalDescription('آیا از تأیید هویت و فعال‌سازی حساب این عضو اطمینان دارید؟')
                    ->visible(fn (VerificationRequest $record): bool => Access::allows(['admin']) && $record->status === 'pending')
                    ->action(fn (VerificationRequest $record) => app(VerificationService::class)->decide($record, auth()->user(), 'approve')),
                Action::make('correction')
                    ->label('اصلاح')
                    ->icon(Heroicon::OutlinedPencilSquare)
                    ->color('warning')
                    ->visible(fn (VerificationRequest $record): bool => Access::allows(['admin']) && $record->status === 'pending')
                    ->schema([Textarea::make('note')->label('توضیح برای عضو')->required()])
                    ->action(fn (VerificationRequest $record, array $data) => app(VerificationService::class)->decide($record, auth()->user(), 'correction', $data['note'])),
                Action::make('reject')
                    ->label('رد')
                    ->icon(Heroicon::OutlinedXCircle)
                    ->color('danger')
                    ->requiresConfirmation()
                    ->modalHeading('رد درخواست احراز')
                    ->visible(fn (VerificationRequest $record): bool => Access::allows(['admin']) && $record->status === 'pending')
                    ->schema([Textarea::make('note')->label('دلیل رد')])
                    ->action(fn (VerificationRequest $record, array $data) => app(VerificationService::class)->decide($record, auth()->user(), 'reject', $data['note'] ?? null)),
            ]);
    }

    public static function getPages(): array
    {
        return ['index' => ListVerificationRequests::route('/')];
    }
}
