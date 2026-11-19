<?php

namespace App\Filament\Resources;

use App\Filament\Access;
use App\Filament\Resources\TopicResource\Pages\ListTopics;
use App\Models\Topic;
use App\Services\ModerationService;
use Filament\Actions\Action;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class TopicResource extends Resource
{
    protected static ?string $model = Topic::class;

    protected static ?string $navigationLabel = 'موضوع‌های انجمن';

    protected static ?string $modelLabel = 'موضوع';

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
            TextColumn::make('kind')->label('نوع'),
            TextColumn::make('author.name')->label('نویسنده'),
            TextColumn::make('anonymous')->label('ناشناس'),
        ])->recordActions([
            Action::make('hide')->label('مخفی')->action(fn (Topic $record) => app(ModerationService::class)->hide($record, auth()->user())),
        ]);
    }

    public static function getPages(): array
    {
        return ['index' => ListTopics::route('/')];
    }
}
