<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureEmployer
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $organization = $user?->organization;

        if (! $user || $user->role !== 'employer' || $user->account_status !== 'verified' || $organization?->status !== 'verified') {
            return response()->json([
                'message' => 'پنل کارفرما پس از تأیید سازمان فعال می‌شود.',
            ], 403);
        }

        return $next($request);
    }
}
