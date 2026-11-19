<?php

namespace App\Services;

use App\Contracts\SmsSender;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class OtpService
{
    public function send(string $phone): array
    {
        $code = (string) random_int(10000, 99999);
        Cache::put($this->key($phone), Hash::make($code), now()->addMinutes(5));
        app(SmsSender::class)->send($phone, "کد ورود طبیار: {$code}");

        $payload = ['message' => 'اگر شماره مجاز باشد، کد تأیید ارسال می‌شود.'];

        if (config('tebyar.sms') === 'log') {
            $payload['debug_code'] = $code;
        }

        return $payload;
    }

    public function check(string $phone, string $code): void
    {
        $hash = Cache::get($this->key($phone));

        if (! $hash || ! Hash::check($code, $hash)) {
            throw ValidationException::withMessages([
                'code' => 'کد تأیید نادرست یا منقضی است.',
            ]);
        }

        Cache::forget($this->key($phone));
    }

    private function key(string $phone): string
    {
        return 'otp:'.$phone;
    }
}
