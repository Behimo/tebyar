<?php

namespace App\Filament\Resources;

use App\Filament\Access;
use App\Filament\Resources\PostResource\Pages\ListPosts;
use App\Models\Post;
use App\Services\ModerationService;
use Filament\Actions\Action;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class PostResource extends Resource
{
    protected static ?string $model = Post::class;

    protected static ?string $navigationLabel = 'پست‌ها';

    protected static ?string $modelLabel = 'پست';

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
            TextColumn::make('author.name')->label('نویسنده'),
            TextColumn::make('body')->label('متن')->limit(60),
            TextColumn::make('hidden_at')->label('مخفی'),
        ])->recordActions([
            Action::make('hide')->label('مخفی')->action(fn (Post $record) => app(ModerationService::class)->hide($record, auth()->user())),
            Action::make('remove')->label('حذف')->action(fn (Post $record) => app(ModerationService::class)->remove($record, auth()->user())),
        ]);
    }

    public static function getPages(): array
    {
        return ['index' => ListPosts::route('/')];
    }
}
