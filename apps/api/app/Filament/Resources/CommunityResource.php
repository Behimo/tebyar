<?php

namespace App\Filament\Resources;

use App\Filament\Access;
use App\Filament\Resources\CommunityResource\Pages\ListCommunities;
use App\Models\Community;
use Filament\Actions\CreateAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class CommunityResource extends Resource
{
    protected static ?string $model = Community::class;

    protected static ?string $navigationLabel = 'انجمن‌ها';

    protected static ?string $modelLabel = 'انجمن';

    public static function canViewAny(): bool
    {
        return Access::allows(['admin']);
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->components([
            TextInput::make('name')->label('نام')->required(),
            TextInput::make('slug')->label('نامک')->required(),
            TextInput::make('specialty')->label('تخصص')->required(),
            Textarea::make('description')->label('توضیح')->required(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table->columns([
            TextColumn::make('name')->label('نام'),
            TextColumn::make('specialty')->label('تخصص'),
        ])->headerActions([
            CreateAction::make(),
        ])->recordActions([
            EditAction::make(),
        ]);
    }

    public static function getPages(): array
    {
        return ['index' => ListCommunities::route('/')];
    }
}
