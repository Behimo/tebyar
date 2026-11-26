<?php

namespace App\Filament\Resources;

use App\Filament\Access;
use App\Filament\Labels;
use App\Filament\Resources\VacancyResource\Pages\ListVacancies;
use App\Models\Vacancy;
use App\Services\ModerationService;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use UnitEnum;

class VacancyResource extends Resource
{
    protected static ?string $model = Vacancy::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedBriefcase;

    protected static string|UnitEnum|null $navigationGroup = 'محتوا';

    protected static ?int $navigationSort = 4;

    protected static ?string $navigationLabel = 'آگهی‌ها';

    protected static ?string $modelLabel = 'آگهی';

    protected static ?string $pluralModelLabel = 'آگهی‌ها';

    public static function canViewAny(): bool
    {
        return Access::allows(['admin', 'moderator']);
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->components([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('created_at', 'desc')
            ->emptyStateHeading('آگهی همکاری ثبت نشده است')
            ->emptyStateIcon(Heroicon::OutlinedBriefcase)
            ->columns([
                TextColumn::make('title')->label('عنوان')->searchable()->weight('bold'),
                TextColumn::make('organization.name')->label('سازمان')->searchable(),
                TextColumn::make('city')->label('شهر'),
                TextColumn::make('employment_type')
                    ->label('نوع همکاری')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => Labels::employmentType($state))
                    ->color('info'),
                TextColumn::make('status')
                    ->label('وضعیت')
                    ->badge()
                    ->formatStateUsing(fn (Vacancy $record, ?string $state): string => $record->hidden_at ? 'مخفی' : Labels::vacancyStatus($state))
                    ->color(fn (Vacancy $record, ?string $state): string => $record->hidden_at ? 'warning' : Labels::vacancyStatusColor($state)),
                TextColumn::make('created_at')
                    ->label('ثبت')
                    ->since()
                    ->sortable(),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->label('وضعیت')
                    ->options([
                        'published' => 'منتشرشده',
                        'draft' => 'پیش‌نویس',
                        'closed' => 'بسته‌شده',
                    ]),
            ])
            ->recordActions([
                Action::make('hide')
                    ->label('مخفی کردن')
                    ->icon(Heroicon::OutlinedEyeSlash)
                    ->color('warning')
                    ->requiresConfirmation()
                    ->visible(fn (Vacancy $record): bool => $record->hidden_at === null)
                    ->action(fn (Vacancy $record) => app(ModerationService::class)->hide($record, auth()->user())),
            ]);
    }

    public static function getPages(): array
    {
        return ['index' => ListVacancies::route('/')];
    }
}
