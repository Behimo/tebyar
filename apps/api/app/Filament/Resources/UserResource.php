<?php

namespace App\Filament\Resources;

use App\Filament\Access;
use App\Filament\Labels;
use App\Filament\Resources\UserResource\Pages\ListUsers;
use App\Models\User;
use App\Services\SubscriptionService;
use App\Services\VerificationService;
use App\Support\Present;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use UnitEnum;

class UserResource extends Resource
{
    protected static ?string $model = User::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedUsers;

    protected static string|UnitEnum|null $navigationGroup = 'احراز و اعضا';

    protected static ?int $navigationSort = 2;

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
            ->defaultSort('created_at', 'desc')
            ->emptyStateHeading('عضوی یافت نشد')
            ->emptyStateIcon(Heroicon::OutlinedUsers)
            ->columns([
                ImageColumn::make('avatar')
                    ->label('')
                    ->circular()
                    ->imageSize(36)
                    ->getStateUsing(fn (User $record): ?string => Present::publicUrl($record->avatar_path)),
                TextColumn::make('name')
                    ->label('نام')
                    ->searchable()
                    ->weight('bold')
                    ->description(fn (User $record): ?string => $record->specialty_title ?: $record->headline),
                TextColumn::make('phone')
                    ->label('موبایل')
                    ->searchable()
                    ->toggleable(),
                TextColumn::make('role')
                    ->label('نقش')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => Labels::userRole($state))
                    ->color(fn (?string $state): string => Labels::userRoleColor($state)),
                TextColumn::make('account_status')
                    ->label('وضعیت')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => Labels::accountStatus($state))
                    ->color(fn (?string $state): string => Labels::accountStatusColor($state)),
                TextColumn::make('staff_role')
                    ->label('نقش کارکنان')
                    ->badge()
                    ->formatStateUsing(fn (?string $state): string => Labels::staffRole($state))
                    ->color(fn (?string $state): string => Labels::staffRoleColor($state)),
                TextColumn::make('city')
                    ->label('شهر')
                    ->placeholder('—')
                    ->toggleable(),
                TextColumn::make('pro_until')
                    ->label('پرو تا')
                    ->badge()
                    ->formatStateUsing(fn ($state): string => $state && $state->isFuture() ? $state->format('Y-m-d') : 'رایگان')
                    ->color(fn ($state): string => $state && $state->isFuture() ? 'success' : 'gray')
                    ->toggleable(),
                TextColumn::make('created_at')
                    ->label('عضویت')
                    ->since()
                    ->tooltip(fn (User $record): string => $record->created_at?->format('Y-m-d H:i') ?? '')
                    ->sortable(),
            ])
            ->filters([
                SelectFilter::make('account_status')->label('وضعیت')->options([
                    'pending_review' => 'در انتظار بررسی',
                    'verified' => 'تأییدشده',
                    'needs_correction' => 'نیازمند اصلاح',
                    'suspended' => 'تعلیق‌شده',
                    'revoked' => 'لغوشده',
                ]),
                SelectFilter::make('role')->label('نقش')->options([
                    'student' => 'دانشجو',
                    'intern' => 'اینترن',
                    'resident' => 'رزیدنت',
                    'general' => 'پزشک عمومی',
                    'specialist' => 'متخصص',
                    'employer' => 'کارفرما',
                ]),
            ])
            ->recordActions([
                Action::make('status')
                    ->label('وضعیت حساب')
                    ->icon(Heroicon::OutlinedShieldCheck)
                    ->color('warning')
                    ->visible(fn (): bool => Access::allows(['admin']))
                    ->schema([
                        Select::make('status')->label('وضعیت')->options([
                            'verified' => 'تأییدشده',
                            'needs_correction' => 'نیازمند اصلاح',
                            'suspended' => 'تعلیق‌شده',
                            'revoked' => 'لغوشده',
                        ])->required(),
                        Textarea::make('note')->label('یادداشت'),
                    ])
                    ->action(function (User $record, array $data): void {
                        app(VerificationService::class)->setAccountStatus($record, auth()->user(), $data['status'], $data['note'] ?? null);
                    }),
                Action::make('staff')
                    ->label('نقش کارکنان')
                    ->icon(Heroicon::OutlinedIdentification)
                    ->color('gray')
                    ->visible(fn (): bool => Access::allows(['admin']))
                    ->schema([
                        Select::make('staff_role')->label('نقش')->options([
                            '' => 'بدون نقش',
                            'support' => 'پشتیبان',
                            'moderator' => 'ناظر',
                            'admin' => 'ادمین',
                        ]),
                    ])
                    ->action(function (User $record, array $data): void {
                        $record->staff_role = $data['staff_role'] ?: null;
                        $record->save();
                    }),
                Action::make('pro')
                    ->label('مدیریت پرو')
                    ->icon(Heroicon::OutlinedSparkles)
                    ->color('info')
                    ->visible(fn (): bool => Access::allows(['admin']))
                    ->schema([
                        Select::make('mode')
                            ->label('عملیات')
                            ->options([
                                'grant' => 'اعطای / تمدید اشتراک پرو',
                                'revoke' => 'لغو اشتراک پرو',
                            ])
                            ->default('grant')
                            ->required(),
                        TextInput::make('months')
                            ->label('مدت (ماه)')
                            ->numeric()
                            ->minValue(1)
                            ->default(1),
                        Textarea::make('note')->label('یادداشت'),
                    ])
                    ->action(function (User $record, array $data): void {
                        $service = app(SubscriptionService::class);
                        if (($data['mode'] ?? 'grant') === 'revoke') {
                            $service->revoke($record, auth()->user(), $data['note'] ?? null);
                        } else {
                            $service->grant($record, auth()->user(), (int) ($data['months'] ?? 1), $data['note'] ?? null);
                        }
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
