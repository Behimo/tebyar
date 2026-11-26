<?php

namespace App\Filament\Resources;

use App\Filament\Access;
use App\Filament\Labels;
use App\Filament\Resources\TopicResource\Pages\ListTopics;
use App\Models\Topic;
use App\Services\ModerationService;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use UnitEnum;

class TopicResource extends Resource
{
    protected static ?string $model = Topic::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedChatBubbleBottomCenterText;

    protected static string|UnitEnum|null $navigationGroup = 'محتوا';

    protected static ?int $navigationSort = 2;

    protected static ?string $navigationLabel = 'موضوع‌های انجمن';

    protected static ?string $modelLabel = 'موضوع';

    protected static ?string $pluralModelLabel = 'موضوع‌های انجمن';

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
            ->emptyStateHeading('موضوعی ثبت نشده است')
            ->emptyStateIcon(Heroicon::OutlinedChatBubbleBottomCenterText)
            ->columns([
                TextColumn::make('title')
                    ->label('عنوان')
                    ->searchable()
                    ->weight('bold')
                    ->description(fn (Topic $record): ?string => $record->community?->name),
                TextColumn::make('kind')
                    ->label('نوع')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => Labels::topicKind($state))
                    ->color(fn (?string $state): string => Labels::topicKindColor($state)),
                TextColumn::make('author.name')
                    ->label('نویسنده')
                    ->searchable(),
                IconColumn::make('anonymous')
                    ->label('ناشناس')
                    ->boolean(),
                TextColumn::make('status_view')
                    ->label('وضعیت')
                    ->badge()
                    ->getStateUsing(fn (Topic $record): string => $record->hidden_at ? 'مخفی' : 'فعال')
                    ->color(fn (Topic $record): string => $record->hidden_at ? 'warning' : 'success'),
                TextColumn::make('created_at')
                    ->label('زمان')
                    ->since()
                    ->sortable(),
            ])
            ->filters([
                SelectFilter::make('kind')
                    ->label('نوع')
                    ->options([
                        'case' => 'کیس بالینی',
                        'poll' => 'نظرسنجی',
                        'discussion' => 'بحث تخصصی',
                    ]),
            ])
            ->recordActions([
                Action::make('hide')
                    ->label('مخفی کردن')
                    ->icon(Heroicon::OutlinedEyeSlash)
                    ->color('warning')
                    ->requiresConfirmation()
                    ->visible(fn (Topic $record): bool => $record->hidden_at === null)
                    ->action(fn (Topic $record) => app(ModerationService::class)->hide($record, auth()->user())),
            ]);
    }

    public static function getPages(): array
    {
        return ['index' => ListTopics::route('/')];
    }
}
