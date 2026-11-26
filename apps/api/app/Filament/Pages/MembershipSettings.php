<?php

namespace App\Filament\Pages;

use App\Filament\Access;
use App\Services\AuditLogger;
use App\Support\AppSettings;
use BackedEnum;
use Filament\Actions\Action;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Notifications\Notification;
use Filament\Pages\Page;
use Filament\Schemas\Components\Actions;
use Filament\Schemas\Components\EmbeddedSchema;
use Filament\Schemas\Components\Form;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use UnitEnum;

class MembershipSettings extends Page
{
    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedAdjustmentsHorizontal;

    protected static string|UnitEnum|null $navigationGroup = 'سیستم';

    protected static ?int $navigationSort = 2;

    protected static ?string $navigationLabel = 'تنظیمات اشتراک و سقف‌ها';

    protected static ?string $title = 'تنظیمات اشتراک و سقف‌های رایگان';

    /** @var array<string, mixed>|null */
    public ?array $data = [];

    public static function canAccess(): bool
    {
        return Access::allows(['admin']);
    }

    public function mount(): void
    {
        $this->form->fill([
            'limits_enabled' => AppSettings::limitsEnabled(),
            'free_quotas' => AppSettings::freeQuotas(),
            'pro_plans' => AppSettings::proPlans(),
            'pro_payment_note' => AppSettings::proPaymentNote(),
        ]);
    }

    public function defaultForm(Schema $schema): Schema
    {
        return $schema->statePath('data');
    }

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Section::make('سقف‌های عضویت رایگان (یک‌بار برای کل حساب)')
                ->description('این محدودیت‌ها فقط برای اعضای احرازشده غیرپرو اعمال می‌شود.')
                ->schema([
                    Toggle::make('limits_enabled')
                        ->label('فعال‌سازی محدودیت‌های عضویت رایگان'),
                    TextInput::make('free_quotas.posts')
                        ->label('حداکثر پست فید')
                        ->numeric()
                        ->minValue(0)
                        ->required(),
                    TextInput::make('free_quotas.stories')
                        ->label('حداکثر استوری')
                        ->numeric()
                        ->minValue(0)
                        ->required(),
                    TextInput::make('free_quotas.topics')
                        ->label('حداکثر موضوع انجمن')
                        ->numeric()
                        ->minValue(0)
                        ->required(),
                    TextInput::make('free_quotas.comments')
                        ->label('حداکثر نظر و پاسخ')
                        ->numeric()
                        ->minValue(0)
                        ->required(),
                    TextInput::make('free_quotas.conversations')
                        ->label('حداکثر شروع گفتگو (دایرکت و گروه)')
                        ->numeric()
                        ->minValue(0)
                        ->required(),
                ])
                ->columns(2),
            Section::make('طرح‌های طبیار پرو و راهنمای پرداخت')
                ->schema([
                    Repeater::make('pro_plans')
                        ->label('طرح‌های اشتراک')
                        ->schema([
                            TextInput::make('slug')
                                ->label('شناسه یکتا')
                                ->required(),
                            TextInput::make('title')
                                ->label('عنوان طرح')
                                ->required(),
                            TextInput::make('months')
                                ->label('مدت (ماه)')
                                ->numeric()
                                ->minValue(1)
                                ->required(),
                            TextInput::make('amount')
                                ->label('مبلغ (تومان · ۰ = توافقی)')
                                ->numeric()
                                ->minValue(0)
                                ->default(0)
                                ->required(),
                        ])
                        ->columns(4)
                        ->defaultItems(2)
                        ->reorderable(false),
                    Textarea::make('pro_payment_note')
                        ->label('متن راهنمای پرداخت برای کاربر')
                        ->rows(3),
                ]),
        ]);
    }

    public function save(): void
    {
        $state = $this->form->getState();

        AppSettings::setMany([
            'limits_enabled' => (bool) ($state['limits_enabled'] ?? true),
            'free_quotas' => $state['free_quotas'] ?? config('tebyar.free_quotas'),
            'pro_plans' => array_values($state['pro_plans'] ?? []),
            'pro_payment_note' => (string) ($state['pro_payment_note'] ?? ''),
        ]);

        AuditLogger::record(auth()->user(), 'settings.membership.updated');

        Notification::make()
            ->title('تنظیمات اشتراک ذخیره شد')
            ->success()
            ->send();
    }

    public function content(Schema $schema): Schema
    {
        return $schema->components([
            Form::make([EmbeddedSchema::make('form')])
                ->id('form')
                ->livewireSubmitHandler('save')
                ->footer([
                    Actions::make([
                        Action::make('save')
                            ->label('ذخیره تنظیمات')
                            ->submit('save'),
                    ]),
                ]),
        ]);
    }
}
