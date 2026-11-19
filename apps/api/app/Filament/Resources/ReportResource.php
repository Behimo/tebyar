<?php

namespace App\Filament\Resources;

use App\Filament\Access;
use App\Filament\Resources\ReportResource\Pages\ListReports;
use App\Models\Report;
use App\Services\AuditLogger;
use App\Services\ModerationService;
use Filament\Actions\Action;
use Filament\Forms\Components\Textarea;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class ReportResource extends Resource
{
    protected static ?string $model = Report::class;

    protected static ?string $navigationLabel = 'گزارش‌ها';

    protected static ?string $modelLabel = 'گزارش';

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
            ->columns([
                TextColumn::make('reporter.name')->label('گزارش‌دهنده'),
                TextColumn::make('reportable_type')->label('نوع'),
                TextColumn::make('reason')->label('دلیل'),
                TextColumn::make('details')->label('شرح')->limit(40),
                TextColumn::make('status')->label('وضعیت'),
            ])
            ->recordActions([
                Action::make('hide')->label('مخفی کردن')->visible(fn () => Access::allows(['admin', 'moderator']))
                    ->action(function (Report $record) {
                        $subject = $record->reportable;
                        if ($subject && isset($subject->hidden_at)) {
                            app(ModerationService::class)->hide($subject, auth()->user());
                        }
                        $record->forceFill(['status' => 'resolved', 'handled_by' => auth()->id()])->save();
                    }),
                Action::make('dismiss')->label('رد گزارش')
                    ->action(function (Report $record) {
                        $record->forceFill(['status' => 'dismissed', 'handled_by' => auth()->id()])->save();
                        AuditLogger::record(auth()->user(), 'report.dismissed', $record);
                    }),
                Action::make('warn')->label('اخطار')
                    ->schema([Textarea::make('note')->label('متن اخطار')->required()])
                    ->action(function (Report $record, array $data) {
                        $subject = $record->reportable;
                        $target = $subject instanceof \App\Models\User ? $subject : ($subject->user ?? $subject->author ?? null);
                        if ($target instanceof \App\Models\User) {
                            app(ModerationService::class)->warn($target, auth()->user(), $data['note']);
                        }
                        $record->forceFill(['status' => 'resolved', 'handled_by' => auth()->id()])->save();
                    }),
            ]);
    }

    public static function getPages(): array
    {
        return ['index' => ListReports::route('/')];
    }
}
