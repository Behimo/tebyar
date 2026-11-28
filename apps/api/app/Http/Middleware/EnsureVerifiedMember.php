<?php

namespace App\Http\Middleware;

use App\Support\Membership;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureVerifiedMember
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! Membership::isActiveMember($user)) {
            return response()->json([
                'message' => 'حساب شما هنوز به جامعه طبیار دسترسی ندارد.',
            ], 403);
        }

        return $next($request);
    }
}
