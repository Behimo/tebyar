<?php

namespace App\Filament\Resources;

use App\Filament\Access;
use App\Filament\Resources\OrganizationResource\Pages\ListOrganizations;
use App\Models\Organization;
use App\Services\AuditLogger;
use Filament\Actions\Action;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class OrganizationResource extends Resource
{
    protected static ?string $model = Organization::class;

    protected static ?string $navigationLabel = 'سازمان‌ها';

    protected static ?string $modelLabel = 'سازمان';

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
            TextColumn::make('name')->label('نام')->searchable(),
            TextColumn::make('type')->label('نوع'),
            TextColumn::make('city')->label('شهر'),
            TextColumn::make('status')->label('وضعیت'),
            TextColumn::make('owner.name')->label('مالک'),
        ])->recordActions([
            Action::make('verify')->label('تأیید سازمان')->action(function (Organization $record) {
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
