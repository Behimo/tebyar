<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vacancy extends Model
{
    protected $fillable = [
        'organization_id', 'title', 'specialty', 'city', 'employment_type', 'description', 'status', 'hidden_at',
    ];

    protected function casts(): array
    {
        return ['hidden_at' => 'datetime'];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function applications(): HasMany
    {
        return $this->hasMany(VacancyApplication::class);
    }

    public function employmentLabel(): string
    {
        return match ($this->employment_type) {
            'full_time' => 'تمام‌وقت',
            'part_time' => 'پاره‌وقت',
            'teaching' => 'تدریس',
            'collaboration' => 'همکاری حرفه‌ای',
            default => $this->employment_type,
        };
    }
}
