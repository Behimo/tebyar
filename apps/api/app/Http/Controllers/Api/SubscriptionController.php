<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use App\Services\SubscriptionService;
use App\Support\AppSettings;
use App\Support\Membership;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $history = $user->subscriptions()->latest()->limit(12)->get();
        $pending = $history->firstWhere('status', 'pending');

        return response()->json([
            'data' => [
                'is_pro' => Membership::isPro($user),
                'pro_until' => $user->pro_until?->toIso8601String(),
                'plans' => AppSettings::proPlans(),
                'payment_note' => AppSettings::proPaymentNote(),
                'pending' => $pending ? $this->format($pending) : null,
                'history' => $history->map(fn (Subscription $row) => $this->format($row))->values(),
                'quotas' => Membership::quotas($user),
            ],
        ]);
    }

    public function store(Request $request, SubscriptionService $service): JsonResponse
    {
        $data = $request->validate([
            'plan' => ['required', 'string', 'max:60'],
            'reference' => ['nullable', 'string', 'max:120'],
        ]);

        $subscription = $service->request($request->user(), $data['plan'], $data['reference'] ?? null);

        return response()->json([
            'data' => $this->format($subscription),
            'message' => 'درخواست ارتقا به طبیار پرو ثبت شد و پس از بررسی فعال می‌شود.',
        ], 201);
    }

    /** @return array<string, mixed> */
    private function format(Subscription $subscription): array
    {
        return [
            'id' => $subscription->id,
            'plan' => $subscription->plan,
            'months' => $subscription->months,
            'amount' => $subscription->amount,
            'status' => $subscription->status,
            'status_label' => match ($subscription->status) {
                'pending' => 'در انتظار بررسی',
                'active' => 'فعال',
                'rejected' => 'ردشده',
                'cancelled' => 'لغوشده',
                default => $subscription->status,
            },
            'reference' => $subscription->reference,
            'note' => $subscription->note,
            'starts_at' => $subscription->starts_at?->toIso8601String(),
            'ends_at' => $subscription->ends_at?->toIso8601String(),
            'created_at' => $subscription->created_at?->toIso8601String(),
        ];
    }
}
