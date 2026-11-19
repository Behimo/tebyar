<?php

namespace App\Filament\Resources;

use App\Filament\Access;
use App\Filament\Resources\VerificationRequestResource\Pages\ListVerificationRequests;
use App\Models\VerificationRequest;
use App\Services\VerificationService;
use Filament\Actions\Action;
use Filament\Forms\Components\Textarea;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class VerificationRequestResource extends Resource
{
    protected static ?string $model = VerificationRequest::class;

    protected static ?string $navigationLabel = 'احراز هویت';

    protected static ?string $modelLabel = 'درخواست احراز';

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
                TextColumn::make('user.name')->label('عضو')->searchable(),
                TextColumn::make('type')->label('نوع'),
                TextColumn::make('status')->label('وضعیت'),
                TextColumn::make('note')->label('یادداشت')->limit(40),
                TextColumn::make('created_at')->label('زمان')->dateTime('Y-m-d H:i'),
                TextColumn::make('document')
                    ->label('مدرک')
                    ->state('دانلود')
                    ->url(fn (VerificationRequest $record) => route('staff.verification', $record))
                    ->openUrlInNewTab(),
            ])
            ->recordActions([
                Action::make('approve')->label('تأیید')->visible(fn () => Access::allows(['admin']))
                    ->action(fn (VerificationRequest $record) => app(VerificationService::class)->decide($record, auth()->user(), 'approve')),
                Action::make('correction')->label('اصلاح')->visible(fn () => Access::allows(['admin']))
                    ->schema([Textarea::make('note')->label('توضیح')->required()])
                    ->action(fn (VerificationRequest $record, array $data) => app(VerificationService::class)->decide($record, auth()->user(), 'correction', $data['note'])),
                Action::make('reject')->label('رد')->visible(fn () => Access::allows(['admin']))
                    ->schema([Textarea::make('note')->label('دلیل')])
                    ->action(fn (VerificationRequest $record, array $data) => app(VerificationService::class)->decide($record, auth()->user(), 'reject', $data['note'] ?? null)),
            ]);
    }

    public static function getPages(): array
    {
        return ['index' => ListVerificationRequests::route('/')];
    }
}
