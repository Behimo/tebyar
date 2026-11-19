<?php

namespace App\Filament\Resources;

use App\Filament\Access;
use App\Filament\Resources\UserResource\Pages\ListUsers;
use App\Models\User;
use App\Services\VerificationService;
use Filament\Actions\Action;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;

class UserResource extends Resource
{
    protected static ?string $model = User::class;

    protected static ?string $navigationLabel = 'اعضا';

    protected static ?string $modelLabel = 'عضو';

    protected static ?string $pluralModelLabel = 'اعضا';

    public static function canViewAny(): bool
    {
        return Access::allows(['admin', 'support', 'moderator']);
    }

    public static function form(Schema $schema): Schema
    {
        return $schema->components([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('name')->label('نام')->searchable(),
                TextColumn::make('phone')->label('موبایل')->toggleable(),
                TextColumn::make('role')->label('نقش'),
                TextColumn::make('account_status')->label('وضعیت'),
                TextColumn::make('staff_role')->label('نقش کارکنان'),
                TextColumn::make('city')->label('شهر'),
            ])
            ->filters([
                SelectFilter::make('account_status')->label('وضعیت')->options([
                    'pending_review' => 'در انتظار',
                    'verified' => 'تأییدشده',
                    'needs_correction' => 'نیازمند اصلاح',
                    'suspended' => 'تعلیق',
                    'revoked' => 'لغو',
                ]),
                SelectFilter::make('role')->label('نقش')->options([
                    'student' => 'دانشجو',
                    'intern' => 'اینترن',
                    'resident' => 'رزیدنت',
                    'general' => 'عمومی',
                    'specialist' => 'متخصص',
                    'employer' => 'کارفرما',
                ]),
            ])
            ->recordActions([
                Action::make('status')
                    ->label('وضعیت حساب')
                    ->visible(fn () => Access::allows(['admin']))
                    ->schema([
                        Select::make('status')->label('وضعیت')->options([
                            'verified' => 'تأییدشده',
                            'needs_correction' => 'نیازمند اصلاح',
                            'suspended' => 'تعلیق',
                            'revoked' => 'لغو',
                        ])->required(),
                        Textarea::make('note')->label('یادداشت'),
                    ])
                    ->action(function (User $record, array $data) {
                        app(VerificationService::class)->setAccountStatus($record, auth()->user(), $data['status'], $data['note'] ?? null);
                    }),
                Action::make('staff')
                    ->label('نقش کارکنان')
                    ->visible(fn () => Access::allows(['admin']))
                    ->schema([
                        Select::make('staff_role')->label('نقش')->options([
                            '' => 'بدون نقش',
                            'support' => 'پشتیبان',
                            'moderator' => 'ناظر',
                            'admin' => 'ادمین',
                        ]),
                    ])
                    ->action(function (User $record, array $data) {
                        $record->staff_role = $data['staff_role'] ?: null;
                        $record->save();
                    }),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListUsers::route('/'),
        ];
    }
}
