<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organization extends Model
{
    protected $fillable = ['owner_id', 'name', 'type', 'city', 'about', 'status', 'document_path'];

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function vacancies(): HasMany
    {
        return $this->hasMany(Vacancy::class);
    }

    public function typeLabel(): string
    {
        return match ($this->type) {
            'clinic' => 'کلینیک',
            'hospital' => 'بیمارستان',
            'teaching' => 'مرکز آموزشی',
            default => $this->type,
        };
    }
}
