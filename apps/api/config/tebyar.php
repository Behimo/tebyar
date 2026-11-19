<?php

return [
    'sms' => env('SMS_DRIVER', 'log'),
    'kavenegar_key' => env('KAVENEGAR_API_KEY'),
    'kavenegar_sender' => env('KAVENEGAR_SENDER', '10004346'),
    'student_daily_posts' => (int) env('STUDENT_DAILY_POSTS', 5),
    'story_hours' => 24,
    'fcm_server_key' => env('FCM_SERVER_KEY'),
];
