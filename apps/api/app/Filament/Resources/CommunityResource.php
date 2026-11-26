<?php

namespace App\Filament\Resources;

use App\Filament\Access;
use App\Filament\Resources\CommunityResource\Pages\ListCommunities;
use App\Models\Community;
use BackedEnum;
use Filament\Actions\CreateAction;
use Filament\Actions\EditAction;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use UnitEnum;

class CommunityResource extends Resource
{
    protected static ?string $model = Community::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedUserGroup;

    protected static string|UnitEnum|null $navigationGroup = 'محتوا';

    protected static ?int $navigationSort = 3;

    protected static ?string $navigationLabel = 'انجمن‌ها';

    protected static ?string $modelLabel = 'انجمن';

    protected static ?string $pluralModelLabel = 'انجمن‌ها';

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
        return $table
            ->emptyStateHeading('انجمنی تعریف نشده است')
            ->emptyStateIcon(Heroicon::OutlinedUserGroup)
            ->columns([
                TextColumn::make('name')->label('نام')->searchable()->weight('bold'),
                TextColumn::make('specialty')->label('تخصص')->badge()->color('info'),
                TextColumn::make('members_count')->label('اعضا')->counts('members')->badge()->color('gray'),
                TextColumn::make('topics_count')->label('موضوع‌ها')->counts('topics')->badge()->color('primary'),
            ])
            ->headerActions([
                CreateAction::make()->label('انجمن جدید'),
            ])
            ->recordActions([
                EditAction::make()->label('ویرایش'),
            ]);
    }

    public static function getPages(): array
    {
        return ['index' => ListCommunities::route('/')];
    }
}
