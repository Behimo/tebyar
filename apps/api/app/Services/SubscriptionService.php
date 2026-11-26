<?php

namespace App\Services;

use App\Models\Subscription;
use App\Models\User;
use App\Support\AppSettings;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubscriptionService
{
    public function request(User $user, string $planSlug, ?string $reference = null): Subscription
    {
        $plan = collect(AppSettings::proPlans())->firstWhere('slug', $planSlug);

        if (! $plan) {
            throw ValidationException::withMessages([
                'plan' => 'طرح انتخاب‌شده معتبر نیست.',
            ]);
        }

        $pending = $user->subscriptions()->where('status', 'pending')->latest()->first();
        if ($pending) {
            throw ValidationException::withMessages([
                'plan' => 'شما یک درخواست ارتقای در انتظار بررسی دارید.',
            ]);
        }

        $subscription = $user->subscriptions()->create([
            'plan' => $plan['title'],
            'months' => $plan['months'],
            'amount' => $plan['amount'],
            'status' => 'pending',
            'reference' => $reference ? trim($reference) : null,
        ]);

        AuditLogger::record($user, 'subscription.requested', $subscription, [
            'plan' => $plan['title'],
            'months' => $plan['months'],
        ]);

        return $subscription;
    }

    public function activate(Subscription $subscription, ?User $admin = null, ?string $note = null): Subscription
    {
        return DB::transaction(function () use ($subscription, $admin, $note): Subscription {
            $user = $subscription->user()->lockForUpdate()->firstOrFail();
            $anchor = $user->pro_until && $user->pro_until->isFuture()
                ? $user->pro_until->copy()
                : now();
            $endsAt = $anchor->copy()->addMonths(max(1, $subscription->months));

            $subscription->forceFill([
                'status' => 'active',
                'starts_at' => $anchor,
                'ends_at' => $endsAt,
                'handled_by' => $admin?->id,
                'note' => $note ?: $subscription->note,
            ])->save();

            $user->forceFill(['pro_until' => $endsAt])->save();

            AuditLogger::record($admin, 'subscription.activated', $subscription, [
                'user_id' => $user->id,
                'months' => $subscription->months,
                'ends_at' => $endsAt->toIso8601String(),
            ]);

            Alerts::send(
                $user,
                'pro',
                'طبیار پرو فعال شد',
                'اشتراک «'.$subscription->plan.'» با موفقیت برای حساب شما فعال شد.',
                '/settings',
            );

            return $subscription->fresh();
        });
    }

    public function reject(Subscription $subscription, User $admin, ?string $note = null): Subscription
    {
        $subscription->forceFill([
            'status' => 'rejected',
            'handled_by' => $admin->id,
            'note' => $note ?: $subscription->note,
        ])->save();

        AuditLogger::record($admin, 'subscription.rejected', $subscription, [
            'user_id' => $subscription->user_id,
            'note' => $note,
        ]);

        Alerts::send(
            $subscription->user,
            'warning',
            'درخواست اشتراک پرو رد شد',
            $note ? 'توضیح پشتیبانی: '.$note : 'درخواست اشتراک پرو تایید نشد. برای جزئیات با پشتیبانی در ارتباط باشید.',
            '/settings',
        );

        return $subscription->fresh();
    }

    public function grant(User $user, User $admin, int $months, ?string $note = null): Subscription
    {
        $months = max(1, $months);

        $subscription = $user->subscriptions()->create([
            'plan' => "اعطای ادمین ({$months} ماهه)",
            'months' => $months,
            'amount' => 0,
            'status' => 'pending',
            'note' => $note,
        ]);

        return $this->activate($subscription, $admin, $note);
    }

    public function revoke(User $user, User $admin, ?string $note = null): void
    {
        DB::transaction(function () use ($user, $admin, $note): void {
            $user->forceFill(['pro_until' => null])->save();
            $user->subscriptions()
                ->where('status', 'active')
                ->where('ends_at', '>', now())
                ->update([
                    'status' => 'cancelled',
                    'handled_by' => $admin->id,
                    'note' => $note,
                ]);

            AuditLogger::record($admin, 'subscription.revoked', $user, [
                'note' => $note,
            ]);
        });
    }
}
