<?php

namespace App\Filament\Resources;

use App\Filament\Access;
use App\Filament\Resources\AuditLogResource\Pages\ListAuditLogs;
use App\Models\AuditLog;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class AuditLogResource extends Resource
{
    protected static ?string $model = AuditLog::class;

    protected static ?string $navigationLabel = 'گزارش اقدامات';

    protected static ?string $modelLabel = 'رویداد';

    public static function canViewAny(): bool
    {
        return Access::allows(['admin']);
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->components([]);
    }

    public static function table(Table $table): Table
    {
        return $table->columns([
            TextColumn::make('created_at')->label('زمان')->dateTime('Y-m-d H:i'),
            TextColumn::make('action')->label('اقدام')->searchable(),
            TextColumn::make('actor_id')->label('انجام‌دهنده'),
            TextColumn::make('subject_type')->label('موضوع'),
            TextColumn::make('subject_id')->label('شناسه'),
        ]);
    }

    public static function getPages(): array
    {
        return ['index' => ListAuditLogs::route('/')];
    }
}
