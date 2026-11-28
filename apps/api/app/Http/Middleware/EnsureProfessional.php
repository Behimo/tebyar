<?php

namespace App\Http\Middleware;

use App\Support\Membership;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureProfessional
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! Membership::isProfessional($user) || $user->account_status !== 'verified') {
            return response()->json([
                'message' => 'این امکان فقط برای اعضای حرفه‌ای (دارای کد نظام) فعال است.',
            ], 403);
        }

        return $next($request);
    }
}
