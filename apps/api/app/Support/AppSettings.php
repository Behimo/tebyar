<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

class AppSettings
{
    private const CACHE_KEY = 'tebyar.app_settings.all';

    /** @return array<string, mixed> */
    public static function all(): array
    {
        return Cache::remember(self::CACHE_KEY, 300, function (): array {
            if (! Schema::hasTable('settings')) {
                return [];
            }

            return Setting::query()
                ->pluck('value', 'key')
                ->all();
        });
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        $all = self::all();

        return array_key_exists($key, $all) ? $all[$key] : $default;
    }

    public static function set(string $key, mixed $value): void
    {
        Setting::query()->updateOrCreate(
            ['key' => $key],
            ['value' => $value],
        );

        Cache::forget(self::CACHE_KEY);
    }

    /** @param array<string, mixed> $pairs */
    public static function setMany(array $pairs): void
    {
        foreach ($pairs as $key => $value) {
            Setting::query()->updateOrCreate(
                ['key' => $key],
                ['value' => $value],
            );
        }

        Cache::forget(self::CACHE_KEY);
    }

    public static function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    public static function limitsEnabled(): bool
    {
        return (bool) self::get('limits_enabled', config('tebyar.limits_enabled', true));
    }

    /** @return array<string, int> */
    public static function freeQuotas(): array
    {
        $defaults = config('tebyar.free_quotas', []);
        $stored = self::get('free_quotas', []);

        if (! is_array($stored)) {
            $stored = [];
        }

        $merged = [];
        foreach ($defaults as $key => $limit) {
            $merged[$key] = max(0, (int) ($stored[$key] ?? $limit));
        }

        return $merged;
    }

    /** @return array<int, array{slug: string, title: string, months: int, amount: int}> */
    public static function proPlans(): array
    {
        $stored = self::get('pro_plans');
        $raw = is_array($stored) && $stored !== [] ? $stored : config('tebyar.pro_plans', []);

        return collect($raw)
            ->filter(fn ($row) => is_array($row) && ! empty($row['title']))
            ->values()
            ->map(function (array $row, int $index): array {
                $months = max(1, (int) ($row['months'] ?? 1));
                $slug = ! empty($row['slug']) ? (string) $row['slug'] : 'pro_'.$months.'m_'.($index + 1);

                return [
                    'slug' => $slug,
                    'title' => (string) $row['title'],
                    'months' => $months,
                    'amount' => max(0, (int) ($row['amount'] ?? 0)),
                ];
            })
            ->all();
    }

    public static function proPaymentNote(): string
    {
        $note = self::get('pro_payment_note', config('tebyar.pro_payment_note', ''));

        return is_string($note) ? $note : '';
    }
}
