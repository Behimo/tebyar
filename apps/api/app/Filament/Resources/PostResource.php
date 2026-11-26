<?php

namespace App\Filament\Resources;

use App\Filament\Access;
use App\Filament\Resources\PostResource\Pages\ListPosts;
use App\Models\Post;
use App\Services\ModerationService;
use App\Support\Present;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;
use UnitEnum;

class PostResource extends Resource
{
    protected static ?string $model = Post::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedNewspaper;

    protected static string|UnitEnum|null $navigationGroup = 'محتوا';

    protected static ?int $navigationSort = 1;

    protected static ?string $navigationLabel = 'پست‌ها';

    protected static ?string $modelLabel = 'پست';

    protected static ?string $pluralModelLabel = 'پست‌ها';

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
            ->emptyStateHeading('پستی وجود ندارد')
            ->emptyStateIcon(Heroicon::OutlinedNewspaper)
            ->columns([
                ImageColumn::make('avatar')
                    ->label('')
                    ->circular()
                    ->imageSize(34)
                    ->getStateUsing(fn (Post $record): ?string => Present::publicUrl($record->author?->avatar_path)),
                TextColumn::make('author.name')
                    ->label('نویسنده')
                    ->searchable()
                    ->weight('bold'),
                TextColumn::make('body')
                    ->label('متن')
                    ->limit(60)
                    ->searchable()
                    ->placeholder('پست تصویری'),
                TextColumn::make('visibility')
                    ->label('وضعیت نمایش')
                    ->badge()
                    ->getStateUsing(function (Post $record): string {
                        if ($record->removed_at) {
                            return 'حذف‌شده';
                        }
                        if ($record->hidden_at) {
                            return 'مخفی';
                        }

                        return 'منتشرشده';
                    })
                    ->color(function (Post $record): string {
                        if ($record->removed_at) {
                            return 'danger';
                        }
                        if ($record->hidden_at) {
                            return 'warning';
                        }

                        return 'success';
                    }),
                TextColumn::make('created_at')
                    ->label('انتشار')
                    ->since()
                    ->tooltip(fn (Post $record): string => $record->created_at?->format('Y-m-d H:i') ?? '')
                    ->sortable(),
            ])
            ->filters([
                TernaryFilter::make('hidden_at')
                    ->label('پست‌های مخفی')
                    ->nullable(),
            ])
            ->recordActions([
                Action::make('hide')
                    ->label('مخفی کردن')
                    ->icon(Heroicon::OutlinedEyeSlash)
                    ->color('warning')
                    ->requiresConfirmation()
                    ->visible(fn (Post $record): bool => $record->hidden_at === null)
                    ->action(fn (Post $record) => app(ModerationService::class)->hide($record, auth()->user())),
                Action::make('remove')
                    ->label('حذف')
                    ->icon(Heroicon::OutlinedTrash)
                    ->color('danger')
                    ->requiresConfirmation()
                    ->modalHeading('حذف پست')
                    ->modalDescription('این پست از دید همه کاربران حذف خواهد شد.')
                    ->visible(fn (Post $record): bool => $record->removed_at === null)
                    ->action(fn (Post $record) => app(ModerationService::class)->remove($record, auth()->user())),
            ]);
    }

    public static function getPages(): array
    {
        return ['index' => ListPosts::route('/')];
    }
}
