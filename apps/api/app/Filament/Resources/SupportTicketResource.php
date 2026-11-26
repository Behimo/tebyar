<?php

namespace App\Filament\Resources;

use App\Filament\Access;
use App\Filament\Labels;
use App\Filament\Resources\SupportTicketResource\Pages\ListSupportTickets;
use App\Models\SupportTicket;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use UnitEnum;

class SupportTicketResource extends Resource
{
    protected static ?string $model = SupportTicket::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedLifebuoy;

    protected static string|UnitEnum|null $navigationGroup = 'پشتیبانی';

    protected static ?int $navigationSort = 1;

    protected static ?string $navigationLabel = 'پشتیبانی';

    protected static ?string $modelLabel = 'تیکت';

    protected static ?string $pluralModelLabel = 'تیکت‌های پشتیبانی';

    public static function canViewAny(): bool
    {
        return Access::allows(['admin', 'support']);
    }

    public static function getNavigationBadge(): ?string
    {
        $count = SupportTicket::query()->where('status', 'open')->count();

        return $count > 0 ? (string) $count : null;
    }

    public static function getNavigationBadgeColor(): ?string
    {
        return 'warning';
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->components([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultSort('created_at', 'desc')
            ->emptyStateHeading('تیکت پشتیبانی ثبت نشده است')
            ->emptyStateIcon(Heroicon::OutlinedLifebuoy)
            ->columns([
                TextColumn::make('id')->label('شماره')->sortable(),
                TextColumn::make('user.name')->label('عضو')->searchable()->weight('bold'),
                TextColumn::make('subject')->label('موضوع')->searchable(),
                TextColumn::make('status')
                    ->label('وضعیت')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => Labels::ticketStatus($state))
                    ->color(fn (?string $state): string => Labels::ticketStatusColor($state)),
                TextColumn::make('created_at')
                    ->label('زمان')
                    ->since()
                    ->tooltip(fn (SupportTicket $record): string => $record->created_at?->format('Y-m-d H:i') ?? '')
                    ->sortable(),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->label('وضعیت')
                    ->options([
                        'open' => 'باز',
                        'pending' => 'پاسخ داده‌شده',
                        'closed' => 'بسته‌شده',
                    ]),
            ])
            ->recordActions([
                Action::make('reply')
                    ->label('پاسخ')
                    ->icon(Heroicon::OutlinedChatBubbleLeftRight)
                    ->color('primary')
                    ->schema([
                        Textarea::make('body')->label('پاسخ')->required(),
                        Toggle::make('is_internal')->label('یادداشت داخلی'),
                    ])
                    ->action(function (SupportTicket $record, array $data): void {
                        $record->messages()->create([
                            'user_id' => auth()->id(),
                            'body' => $data['body'],
                            'is_internal' => (bool) ($data['is_internal'] ?? false),
                        ]);
                        $record->status = ($data['is_internal'] ?? false) ? $record->status : 'pending';
                        $record->assignee_id = auth()->id();
                        $record->save();
                    }),
                Action::make('close')
                    ->label('بستن')
                    ->icon(Heroicon::OutlinedLockClosed)
                    ->color('gray')
                    ->requiresConfirmation()
                    ->visible(fn (SupportTicket $record): bool => $record->status !== 'closed')
                    ->action(fn (SupportTicket $record) => $record->forceFill(['status' => 'closed', 'assignee_id' => auth()->id()])->save()),
            ]);
    }

    public static function getPages(): array
    {
        return ['index' => ListSupportTickets::route('/')];
    }
}
