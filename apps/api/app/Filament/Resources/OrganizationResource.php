<?php

namespace App\Filament\Resources;

use App\Filament\Access;
use App\Filament\Labels;
use App\Filament\Resources\OrganizationResource\Pages\ListOrganizations;
use App\Models\Organization;
use App\Services\AuditLogger;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use UnitEnum;

class OrganizationResource extends Resource
{
    protected static ?string $model = Organization::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedBuildingOffice2;

    protected static string|UnitEnum|null $navigationGroup = 'احراز و اعضا';

    protected static ?int $navigationSort = 3;

    protected static ?string $navigationLabel = 'سازمان‌ها';

    protected static ?string $modelLabel = 'سازمان';

    protected static ?string $pluralModelLabel = 'سازمان‌ها';

    public static function canViewAny(): bool
    {
        return Access::allows(['admin']);
    }

    public static function getNavigationBadge(): ?string
    {
        $count = Organization::query()->where('status', 'pending')->count();

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
            ->emptyStateHeading('مرکز درمانی ثبت نشده است')
            ->emptyStateIcon(Heroicon::OutlinedBuildingOffice2)
            ->columns([
                TextColumn::make('name')->label('نام مرکز')->searchable()->weight('bold'),
                TextColumn::make('type')
                    ->label('نوع')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => Labels::organizationType($state))
                    ->color('info'),
                TextColumn::make('city')->label('شهر')->searchable(),
                TextColumn::make('status')
                    ->label('وضعیت')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => Labels::organizationStatus($state))
                    ->color(fn (?string $state): string => Labels::organizationStatusColor($state)),
                TextColumn::make('owner.name')->label('مالک')->searchable(),
                TextColumn::make('created_at')
                    ->label('ثبت')
                    ->since()
                    ->tooltip(fn (Organization $record): string => $record->created_at?->format('Y-m-d H:i') ?? ''),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->label('وضعیت')
                    ->options([
                        'pending' => 'در انتظار تأیید',
                        'verified' => 'تأییدشده',
                        'rejected' => 'ردشده',
                    ]),
                SelectFilter::make('type')
                    ->label('نوع')
                    ->options([
                        'hospital' => 'بیمارستان',
                        'clinic' => 'کلینیک',
                        'teaching' => 'مرکز آموزشی',
                    ]),
            ])
            ->recordActions([
                Action::make('verify')
                    ->label('تأیید سازمان')
                    ->icon(Heroicon::OutlinedCheckCircle)
                    ->color('success')
                    ->requiresConfirmation()
                    ->visible(fn (Organization $record): bool => $record->status !== 'verified')
                    ->action(function (Organization $record): void {
                        $record->status = 'verified';
                        $record->save();
                        $record->owner->forceFill(['account_status' => 'verified'])->save();
                        AuditLogger::record(auth()->user(), 'organization.verified', $record);
                    }),
            ]);
    }

    public static function getPages(): array
    {
        return ['index' => ListOrganizations::route('/')];
    }
}
