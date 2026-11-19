<?php

use App\Models\Conversation;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('conversation.{conversation}', function ($user, int $conversation) {
    $record = Conversation::query()->find($conversation);

    return $record && $record->involves($user);
});
