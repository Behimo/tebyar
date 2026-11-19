<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    protected $fillable = [
        'type', 'title', 'created_by',
        'user_one_id', 'user_two_id', 'user_one_read_at', 'user_two_read_at', 'last_message_at',
    ];

    protected function casts(): array
    {
        return [
            'user_one_read_at' => 'datetime',
            'user_two_read_at' => 'datetime',
            'last_message_at' => 'datetime',
        ];
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function participants(): HasMany
    {
        return $this->hasMany(ConversationParticipant::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function userOne(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_one_id');
    }

    public function userTwo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_two_id');
    }

    public function isGroup(): bool
    {
        return $this->type === 'group';
    }

    public function participantIds(): array
    {
        if ($this->relationLoaded('participants')) {
            return $this->participants->pluck('user_id')->all();
        }

        return $this->participants()->pluck('user_id')->all();
    }

    public function peer(User $viewer): User
    {
        if ($this->isGroup()) {
            return $viewer;
        }

        return $this->user_one_id === $viewer->id ? $this->userTwo : $this->userOne;
    }

    public function involves(User $user): bool
    {
        if ($this->isGroup()) {
            return $this->participants()->where('user_id', $user->id)->exists();
        }

        return $this->user_one_id === $user->id || $this->user_two_id === $user->id;
    }

    public function ensureDirectParticipants(): void
    {
        if ($this->isGroup() || ! $this->user_one_id || ! $this->user_two_id) {
            return;
        }

        foreach ([$this->user_one_id => $this->user_one_read_at, $this->user_two_id => $this->user_two_read_at] as $userId => $readAt) {
            $this->participants()->updateOrCreate(
                ['user_id' => $userId],
                ['role' => 'member', 'last_read_at' => $readAt],
            );
        }
    }
}