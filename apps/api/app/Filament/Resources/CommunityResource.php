<?php

namespace App\Filament\Resources;

use App\Filament\Access;
use App\Filament\Resources\CommunityResource\Pages\ListCommunities;
use App\Models\Community;
use BackedEnum;
use Filament\Actions\DeleteAction;
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
            TextInput::make('name')->label('نام')->required()->maxLength(120),
            TextInput::make('slug')
                ->label('نامک')
                ->maxLength(120)
                ->rules(['nullable', 'regex:/^[a-z0-9-]+$/'])
                ->helperText('حروف انگلیسی کوچک و خط تیره؛ خالی بگذارید تا خودکار ساخته شود.'),
            TextInput::make('specialty')->label('تخصص')->required()->maxLength(120),
            Textarea::make('description')->label('توضیح')->required()->maxLength(1000),
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
            ->recordActions([
                EditAction::make()->label('ویرایش'),
                DeleteAction::make()
                    ->label('حذف')
                    ->requiresConfirmation()
                    ->modalDescription('انجمن فقط زمانی حذف می‌شود که هیچ موضوعی نداشته باشد.')
                    ->visible(fn (Community $record): bool => $record->topics()->count() === 0),
            ]);
    }

    public static function getPages(): array
    {
        return ['index' => ListCommunities::route('/')];
    }
}
