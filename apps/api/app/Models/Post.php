<?php

namespace App\Models;

use App\Support\Membership;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Post extends Model
{
    protected $fillable = [
        'user_id', 'type', 'body', 'link_url', 'link_title', 'repost_of_id', 'audience', 'is_demo', 'hidden_at', 'removed_at',
    ];

    protected function casts(): array
    {
        return [
            'audience' => 'array',
            'is_demo' => 'boolean',
            'hidden_at' => 'datetime',
            'removed_at' => 'datetime',
        ];
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function media(): HasMany
    {
        return $this->hasMany(PostMedia::class)->orderBy('position');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class);
    }

    public function reactions(): HasMany
    {
        return $this->hasMany(Reaction::class);
    }

    public function bookmarks(): HasMany
    {
        return $this->hasMany(Bookmark::class);
    }

    public function reposts(): HasMany
    {
        return $this->hasMany(Post::class, 'repost_of_id');
    }

    public function original(): BelongsTo
    {
        return $this->belongsTo(Post::class, 'repost_of_id');
    }

    public function hashtags(): BelongsToMany
    {
        return $this->belongsToMany(Hashtag::class);
    }

    public function scopeVisible($query)
    {
        return $query->whereNull('posts.hidden_at')->whereNull('posts.removed_at');
    }

    public function scopeVisibleTo($query, User $viewer)
    {
        if ($viewer->staff_role !== null) {
            return $query;
        }

        $group = Membership::audienceGroupOf($viewer);

        return $query->where(function ($inner) use ($viewer, $group) {
            $inner->whereNull('posts.audience')
                ->orWhere('posts.user_id', $viewer->id);

            if ($group !== null) {
                $inner->orWhere('posts.audience', 'like', '%"'.$group.'"%');
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

    public function scopeWithViewerState($query, User $viewer)
    {
        return $query->withExists([
            'reactions as reacted' => fn ($inner) => $inner->where('user_id', $viewer->id),
            'bookmarks as bookmarked' => fn ($inner) => $inner->where('user_id', $viewer->id),
        ]);
    }
}
