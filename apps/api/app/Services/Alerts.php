<?php

namespace App\Services;

use App\Models\DeviceToken;
use App\Models\User;
use App\Notifications\UserAlert;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class Alerts
{
    public static function send(User $user, string $type, string $title, string $body, ?string $href = null): void
    {
        $interaction = in_array($type, ['like', 'comment', 'follow', 'repost'], true);
        $message = $type === 'message';

        if ($interaction && ! $user->notify_interactions) {
            return;
        }

        if ($message && ! $user->notify_messages) {
            return;
        }

        $user->notify(new UserAlert($type, $title, $body, $href));
        self::push($user, $title, $body);
    }

    public static function push(User $user, string $title, string $body): void
    {
        $key = config('tebyar.fcm_server_key');
        $tokens = DeviceToken::query()->where('user_id', $user->id)->pluck('token');

        if ($tokens->isEmpty()) {
            return;
        }

        if (! $key) {
            Log::info('tebyar.push.skipped', ['user_id' => $user->id, 'title' => $title]);

            return;
        }

        foreach ($tokens as $token) {
            $response = Http::withToken($key)->timeout(8)->post('https://fcm.googleapis.com/fcm/send', [
                'to' => $token,
                'notification' => ['title' => $title, 'body' => $body],
            ]);

            if ($response->failed()) {
                Log::warning('tebyar.push.failed', ['user_id' => $user->id, 'status' => $response->status()]);
            }
        }
    }
}
