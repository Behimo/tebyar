<?php

namespace App\Filament\Resources;

use App\Filament\Access;
use App\Filament\Resources\AuditLogResource\Pages\ListAuditLogs;
use App\Models\AuditLog;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use UnitEnum;

class AuditLogResource extends Resource
{
    protected static ?string $model = AuditLog::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedClipboardDocumentList;

    protected static string|UnitEnum|null $navigationGroup = 'سیستم';

    protected static ?int $navigationSort = 1;

    protected static ?string $navigationLabel = 'گزارش اقدامات';

    protected static ?string $modelLabel = 'رویداد';

    protected static ?string $pluralModelLabel = 'گزارش اقدامات';

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
        return $table
            ->defaultSort('created_at', 'desc')
            ->emptyStateHeading('رویدادی ثبت نشده است')
            ->emptyStateIcon(Heroicon::OutlinedClipboardDocumentList)
            ->columns([
                TextColumn::make('created_at')
                    ->label('زمان')
                    ->since()
                    ->tooltip(fn (AuditLog $record): string => $record->created_at?->format('Y-m-d H:i') ?? '')
                    ->sortable(),
                TextColumn::make('action')->label('اقدام')->badge()->color('info')->searchable(),
                TextColumn::make('actor.name')->label('انجام‌دهنده')->placeholder('سیستم'),
                TextColumn::make('subject_type')
                    ->label('موضوع')
                    ->formatStateUsing(fn (?string $state): string => $state ? class_basename($state) : '—'),
                TextColumn::make('subject_id')->label('شناسه')->placeholder('—'),
            ]);
    }

    public static function getPages(): array
    {
        return ['index' => ListAuditLogs::route('/')];
    }
}
