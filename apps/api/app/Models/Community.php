<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Community extends Model
{
    protected $fillable = ['name', 'slug', 'specialty', 'description'];

    protected static function booted(): void
    {
        static::creating(function (Community $community): void {
            if (! empty($community->slug)) {
                return;
            }

            $base = Str::slug($community->name);
            if ($base === '') {
                $base = 'c-'.Str::lower(Str::random(6));
            }

            $slug = $base;
            while (static::query()->where('slug', $slug)->exists()) {
                $slug = $base.'-'.Str::lower(Str::random(4));
            }

            $community->slug = $slug;
        });
    }

    public function members(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'community_members')->withTimestamps();
    }

    public function topics(): HasMany
    {
        return $this->hasMany(Topic::class);
    }
}
