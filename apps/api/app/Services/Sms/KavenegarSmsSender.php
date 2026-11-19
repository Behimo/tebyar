<?php

namespace App\Services\Sms;

use App\Contracts\SmsSender;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class KavenegarSmsSender implements SmsSender
{
    public function send(string $phone, string $message): void
    {
        $key = config('tebyar.kavenegar_key');

        if (! $key) {
            throw new RuntimeException('کلید کاوه‌نگار تنظیم نشده است.');
        }

        $response = Http::timeout(10)->get('https://api.kavenegar.com/v1/'.$key.'/sms/send.json', [
            'receptor' => $phone,
            'sender' => config('tebyar.kavenegar_sender'),
            'message' => $message,
        ]);

        if ($response->failed()) {
            throw new RuntimeException('ارسال پیامک ناموفق بود.');
        }
    }
}
