<?php

namespace App\Models;

use App\Support\Membership;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Topic extends Model
{
    protected $fillable = [
        'community_id', 'user_id', 'kind', 'audience', 'title', 'body', 'anonymous', 'disclaimer_accepted', 'is_demo', 'hidden_at',
    ];

    protected function casts(): array
    {
        return [
            'audience' => 'array',
            'anonymous' => 'boolean',
            'disclaimer_accepted' => 'boolean',
            'is_demo' => 'boolean',
            'hidden_at' => 'datetime',
        ];
    }

    public function scopeVisibleTo($query, User $viewer)
    {
        if ($viewer->staff_role !== null) {
            return $query;
        }

        $group = Membership::audienceGroupOf($viewer);

        return $query->where(function ($inner) use ($viewer, $group) {
            $inner->whereNull('topics.audience')
                ->orWhere('topics.user_id', $viewer->id);

            if ($group !== null) {
                $inner->orWhere('topics.audience', 'like', '%"'.$group.'"%');
            }
        });
    }

    public function isVisibleTo(User $viewer): bool
    {
        if ($viewer->staff_role !== null || $this->user_id === $viewer->id) {
            return true;
        }

        if ($this->audience === null || $this->audience === []) {
            return true;
        }

        $group = Membership::audienceGroupOf($viewer);

        return $group !== null && in_array($group, $this->audience, true);
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
