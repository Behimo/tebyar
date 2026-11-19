<?php

namespace App\Filament\Resources;

use App\Filament\Access;
use App\Filament\Resources\VacancyResource\Pages\ListVacancies;
use App\Models\Vacancy;
use App\Services\ModerationService;
use Filament\Actions\Action;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class VacancyResource extends Resource
{
    protected static ?string $model = Vacancy::class;

    protected static ?string $navigationLabel = 'آگهی‌ها';

    protected static ?string $modelLabel = 'آگهی';

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
        return $table->columns([
            TextColumn::make('title')->label('عنوان')->searchable(),
            TextColumn::make('organization.name')->label('سازمان'),
            TextColumn::make('city')->label('شهر'),
            TextColumn::make('employment_type')->label('همکاری'),
            TextColumn::make('status')->label('وضعیت'),
        ])->recordActions([
            Action::make('hide')->label('مخفی')->action(fn (Vacancy $record) => app(ModerationService::class)->hide($record, auth()->user())),
        ]);
    }

    public static function getPages(): array
    {
        return ['index' => ListVacancies::route('/')];
    }
}
