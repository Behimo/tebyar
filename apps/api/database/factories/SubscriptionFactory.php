<?php

namespace Database\Factories;

use App\Models\Subscription;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Subscription>
 */
class SubscriptionFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'plan' => 'pro_1m',
            'months' => 1,
            'amount' => 0,
            'status' => 'pending',
            'reference' => null,
        ];
    }

    public function active(int $months = 1): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'active',
            'months' => $months,
            'starts_at' => now(),
            'ends_at' => now()->addMonths($months),
        ]);
    }
}
