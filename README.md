# طبیار

شبکه اجتماعی پزشکان، رزیدنت‌ها و دانشجویان پزشکی. بک‌اند لاراول و یک رابط راست‌چین که هم وب/PWA است و هم با Capacitor به اندروید می‌رود.

## اجرا

```bash
cd apps/api
copy .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
php artisan serve
```

در ترمینال دیگر:

```bash
cd apps/web
npm install
npm run dev
```

وب روی `http://127.0.0.1:5173` و API روی `http://127.0.0.1:8000`. در حالت محلی کد ورود در صفحه OTP نشان داده می‌شود و در لاگ لاراول هم ثبت می‌شود. برای پیامک واقعی `SMS_DRIVER=kavenegar` و `KAVENEGAR_API_KEY` را بگذارید.

پنل کارکنان: `http://127.0.0.1:8000/admin`

- ادمین: `admin@tebyar.test` / `password`
- پشتیبان: `support@tebyar.test` / `password`
- ناظر: `moderator@tebyar.test` / `password`

شماره‌های نمونه برای ورود اپ، همگی با رمز پنل `password` و کد OTP آزمایشی:

- `09121000011` دکتر محمد رضایی، متخصص قلب
- `09121000012` دکتر سارا کریمی، متخصص پوست
- `09121000015` نیلوفر محمدی، دانشجو
- `09121000031` کارفرما

گفتگوی زنده با Laravel Reverb سیم‌کشی شده است. بدون اجرای `php artisan reverb:start` و `php artisan queue:work` هم گفتگو با به‌روزرسانی چندثانیه‌ای کار می‌کند. پوش اندروید فقط وقتی `FCM_SERVER_KEY` باشد ارسال می‌شود.

احراز نظام پزشکی دستی است و در صف ادمین انجام می‌شود.

## اندروید

```bash
cd apps/web
npm run build
npx cap sync android
```

ساخت APK به Android SDK نیاز دارد. اگر SDK نصب نباشد، پروژه اندروید در مخزن می‌ماند و بیلد محلی انجام نمی‌شود.
