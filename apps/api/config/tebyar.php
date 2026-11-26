<?php

return [
    /** آدرس پایه برای /storage — روی سرور واقعی همان دامنهٔ API را بگذارید؛ در غیر این صورت از همان host درخواست استفاده می‌شود. */
    'asset_url' => env('ASSET_URL'),
    'sms' => env('SMS_DRIVER', 'log'),
    'kavenegar_key' => env('KAVENEGAR_API_KEY'),
    'kavenegar_sender' => env('KAVENEGAR_SENDER', '10004346'),
    'student_daily_posts' => (int) env('STUDENT_DAILY_POSTS', 5),
    'story_hours' => 24,
    'fcm_server_key' => env('FCM_SERVER_KEY'),
    'limits_enabled' => (bool) env('TEBYAR_LIMITS_ENABLED', true),
    'free_quotas' => [
        'posts' => 5,
        'stories' => 5,
        'topics' => 2,
        'comments' => 20,
        'conversations' => 3,
    ],
    'pro_plans' => [
        [
            'slug' => 'pro_1m',
            'title' => 'اشتراک یک‌ماهه',
            'months' => 1,
            'amount' => 0,
        ],
        [
            'slug' => 'pro_1y',
            'title' => 'اشتراک یک‌ساله',
            'months' => 12,
            'amount' => 0,
        ],
    ],
    'pro_payment_note' => 'درخواست ارتقای شما توسط تیم پشتیبانی طبیار بررسی و فعال می‌شود. در صورت پرداخت کارت‌به‌کارت یا هماهنگی قبلی، کد پیگیری را در کادر زیر وارد کنید. پرداخت آنلاین به‌زودی فعال خواهد شد.',
];
