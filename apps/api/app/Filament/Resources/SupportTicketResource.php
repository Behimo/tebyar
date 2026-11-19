<?php

namespace App\Filament\Resources;

use App\Filament\Access;
use App\Filament\Resources\SupportTicketResource\Pages\ListSupportTickets;
use App\Models\SupportTicket;
use Filament\Actions\Action;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Toggle;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class SupportTicketResource extends Resource
{
    protected static ?string $model = SupportTicket::class;

    protected static ?string $navigationLabel = 'پشتیبانی';

    protected static ?string $modelLabel = 'تیکت';

    public static function canViewAny(): bool
    {
        return Access::allows(['admin', 'support']);
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->components([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('id')->label('شماره'),
                TextColumn::make('user.name')->label('عضو'),
                TextColumn::make('subject')->label('موضوع')->searchable(),
                TextColumn::make('status')->label('وضعیت'),
                TextColumn::make('created_at')->label('زمان')->dateTime('Y-m-d H:i'),
            ])
            ->recordActions([
                Action::make('reply')->label('پاسخ')
                    ->schema([
                        Textarea::make('body')->label('پاسخ')->required(),
                        Toggle::make('is_internal')->label('یادداشت داخلی'),
                    ])
                    ->action(function (SupportTicket $record, array $data) {
                        $record->messages()->create([
                            'user_id' => auth()->id(),
                            'body' => $data['body'],
                            'is_internal' => (bool) ($data['is_internal'] ?? false),
                        ]);
                        $record->status = ($data['is_internal'] ?? false) ? $record->status : 'pending';
                        $record->assignee_id = auth()->id();
                        $record->save();
                    }),
                Action::make('close')->label('بستن')
                    ->action(fn (SupportTicket $record) => $record->forceFill(['status' => 'closed', 'assignee_id' => auth()->id()])->save()),
            ]);
    }

    public static function getPages(): array
    {
        return ['index' => ListSupportTickets::route('/')];
    }
}
