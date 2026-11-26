<?php

namespace App\Providers;

use App\Contracts\SmsSender;
use App\Services\Sms\KavenegarSmsSender;
use App\Services\Sms\LogSmsSender;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(SmsSender::class, function () {
            return config('tebyar.sms') === 'kavenegar'
                ? new KavenegarSmsSender
                : new LogSmsSender;
        });
    }

    public function boot(): void
    {
        Schema::defaultStringLength(191);

        RateLimiter::for('otp', function (Request $request) {
            return Limit::perMinutes(10, 5)->by($request->ip().'|'.$request->input('phone'));
        });

        RateLimiter::for('impressions', function (Request $request) {
            return Limit::perMinute(60)->by((string) ($request->user()?->id ?: $request->ip()));
        });
    }
}
