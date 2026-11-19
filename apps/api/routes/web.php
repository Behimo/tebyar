<?php

use App\Models\UserIdentity;
use App\Models\VerificationRequest;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return view('welcome');
});

Route::middleware('auth')->group(function () {
    Route::get('/staff/identity/{identity}', function (UserIdentity $identity) {
        abort_unless(auth()->user()?->staff_role === 'admin', 403);
        abort_unless($identity->document_path, 404);

        return Storage::disk('identity')->download($identity->document_path);
    })->name('staff.identity');

    Route::get('/staff/verification/{verification}/document', function (VerificationRequest $verification) {
        abort_unless(auth()->user()?->staff_role === 'admin', 403);
        $path = $verification->payload['document_path'] ?? $verification->user?->identity?->document_path ?? $verification->user?->organization?->document_path;
        abort_unless($path, 404);

        return Storage::disk('identity')->download($path);
    })->name('staff.verification');
});
