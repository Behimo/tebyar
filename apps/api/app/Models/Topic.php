<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Topic extends Model
{
    protected $fillable = [
        'community_id', 'user_id', 'kind', 'title', 'body', 'anonymous', 'disclaimer_accepted', 'is_demo', 'hidden_at',
    ];

    protected function casts(): array
    {
        return [
            'anonymous' => 'boolean',
            'disclaimer_accepted' => 'boolean',
            'is_demo' => 'boolean',
            'hidden_at' => 'datetime',
        ];
    }

    public function community(): BelongsTo
    {
        return $this->belongsTo(Community::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(TopicReply::class);
    }

    public function options(): HasMany
    {
        return $this->hasMany(PollOption::class);
    }

    public function votes(): HasMany
    {
        return $this->hasMany(PollVote::class);
    }
}
