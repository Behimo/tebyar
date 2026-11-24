<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CommunityController;
use App\Http\Controllers\Api\InboxController;
use App\Http\Controllers\Api\JobController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\SocialController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('media/{path}', [MediaController::class, 'show'])->where('path', '.*');
    Route::post('auth/otp', [AuthController::class, 'requestOtp'])->middleware('throttle:otp');
    Route::post('auth/verify', [AuthController::class, 'verifyOtp'])->middleware('throttle:otp');

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('me/sessions', [AuthController::class, 'sessions']);
        Route::delete('me/sessions/{tokenId}', [AuthController::class, 'revokeSession']);
        Route::get('me', [ProfileController::class, 'me']);
        Route::get('me/verification', [ProfileController::class, 'verification']);
        Route::post('me/onboarding', [ProfileController::class, 'onboarding']);
        Route::post('support-tickets', [InboxController::class, 'storeTicket']);
        Route::get('support-tickets', [InboxController::class, 'tickets']);
        Route::post('devices', [InboxController::class, 'storeDevice']);

        Route::middleware('member')->group(function () {
            Route::patch('me', [ProfileController::class, 'update']);
            Route::post('me/avatar', [ProfileController::class, 'avatar']);
            Route::post('me/specialty', [ProfileController::class, 'specialty']);
            Route::post('me/entries', [ProfileController::class, 'storeEntry']);
            Route::delete('me/entries/{entry}', [ProfileController::class, 'destroyEntry']);

            Route::get('feed', [SocialController::class, 'feed']);
            Route::get('explore', [SocialController::class, 'explore']);
            Route::get('posts/{post}', [SocialController::class, 'show']);
            Route::post('posts', [SocialController::class, 'store']);
            Route::patch('posts/{post}', [SocialController::class, 'update']);
            Route::delete('posts/{post}', [SocialController::class, 'destroy']);
            Route::post('posts/{post}/reactions', [SocialController::class, 'react']);
            Route::delete('posts/{post}/reactions', [SocialController::class, 'unreact']);
            Route::post('posts/{post}/comments', [SocialController::class, 'comment']);
            Route::post('posts/{post}/repost', [SocialController::class, 'repost']);
            Route::post('posts/{post}/bookmark', [SocialController::class, 'bookmark']);
            Route::delete('posts/{post}/bookmark', [SocialController::class, 'unbookmark']);
            Route::get('bookmarks', [SocialController::class, 'bookmarks']);
            Route::get('stories', [SocialController::class, 'stories']);
            Route::post('stories', [SocialController::class, 'storeStory']);
            Route::delete('stories/{story}', [SocialController::class, 'destroyStory']);
            Route::post('stories/{story}/view', [SocialController::class, 'viewStory']);

            Route::get('communities', [CommunityController::class, 'index']);
            Route::get('communities/{slug}', [CommunityController::class, 'show']);
            Route::post('communities/{slug}/follow', [CommunityController::class, 'follow']);
            Route::delete('communities/{slug}/follow', [CommunityController::class, 'unfollow']);
            Route::post('communities/{slug}/topics', [CommunityController::class, 'storeTopic']);
            Route::get('topics/{topic}', [CommunityController::class, 'showTopic']);
            Route::post('topics/{topic}/replies', [CommunityController::class, 'reply']);
            Route::post('topics/{topic}/vote', [CommunityController::class, 'vote']);

            Route::get('doctors/{slug}', [ProfileController::class, 'show']);
            Route::get('doctors/{user}/followers', [ProfileController::class, 'followers']);
            Route::get('doctors/{user}/following', [ProfileController::class, 'following']);
            Route::post('doctors/{user}/follow', [ProfileController::class, 'follow']);
            Route::delete('doctors/{user}/follow', [ProfileController::class, 'unfollow']);
            Route::get('search', [InboxController::class, 'search']);

            Route::get('connections', [MessageController::class, 'connections']);
            Route::get('conversations', [MessageController::class, 'index']);
            Route::post('conversations', [MessageController::class, 'open']);
            Route::post('conversations/groups', [MessageController::class, 'storeGroup']);
            Route::post('conversations/{conversation}/members', [MessageController::class, 'addMember']);
            Route::delete('conversations/{conversation}/members/{user}', [MessageController::class, 'removeMember']);
            Route::get('conversations/{conversation}/messages', [MessageController::class, 'messages']);
            Route::post('conversations/{conversation}/messages', [MessageController::class, 'store']);
            Route::get('messages/{message}/attachment', [MessageController::class, 'attachment']);

            Route::get('notifications', [InboxController::class, 'notifications']);
            Route::post('notifications/read', [InboxController::class, 'readNotifications']);
            Route::post('reports', [InboxController::class, 'report']);
            Route::get('blocks', [InboxController::class, 'blocks']);
            Route::post('blocks', [InboxController::class, 'block']);
            Route::delete('blocks/{user}', [InboxController::class, 'unblock']);

            Route::get('jobs', [JobController::class, 'index']);
            Route::get('jobs/{vacancy}', [JobController::class, 'show']);
            Route::post('jobs/{vacancy}/save', [JobController::class, 'save']);
            Route::delete('jobs/{vacancy}/save', [JobController::class, 'unsave']);
            Route::post('jobs/{vacancy}/apply', [JobController::class, 'apply']);
        });

        Route::middleware('employer')->group(function () {
            Route::get('employer/jobs', [JobController::class, 'mine']);
            Route::post('employer/jobs', [JobController::class, 'store']);
            Route::get('employer/jobs/{vacancy}/applications', [JobController::class, 'applications']);
            Route::patch('employer/applications/{application}', [JobController::class, 'updateApplication']);
            Route::get('employer/applications/{application}/resume', [JobController::class, 'resume']);
        });
    });
});
