<?php

namespace App\Services;

use App\Models\Post;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

class ModerationService
{
    public function hide(Model $model, User $actor): void
    {
        $this->guard($actor);
        $model->forceFill(['hidden_at' => now()])->save();
        AuditLogger::record($actor, 'content.hidden', $model);
    }

    public function remove(Model $model, User $actor): void
    {
        $this->guard($actor);
        $payload = ['hidden_at' => now()];

        if ($model instanceof Post) {
            $payload['removed_at'] = now();
        }

        $model->forceFill($payload)->save();
        AuditLogger::record($actor, 'content.removed', $model);
    }

    public function warn(User $target, User $actor, string $note): void
    {
        $this->guard($actor);
        Alerts::send($target, 'warning', 'اخطار نظارت محتوا', $note, '/notifications');
        AuditLogger::record($actor, 'user.warned', $target, ['note' => $note]);
    }

    private function guard(User $actor): void
    {
        if (! in_array($actor->staff_role, ['moderator', 'admin'], true)) {
            throw ValidationException::withMessages([
                'moderation' => 'ناظر یا ادمین می‌تواند محتوا را رسیدگی کند.',
            ]);
        }
    }
}
