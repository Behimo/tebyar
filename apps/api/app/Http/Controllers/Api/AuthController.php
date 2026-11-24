<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\OtpService;
use App\Support\Phones;
use App\Support\Present;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function requestOtp(Request $request, OtpService $otp): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:20'],
        ], [
            'phone.required' => 'شماره موبایل را وارد کنید.',
        ]);

        $phone = Phones::normalize($data['phone']);

        if (! Phones::valid($phone)) {
            throw ValidationException::withMessages([
                'phone' => 'شماره موبایل معتبر نیست.',
            ]);
        }

        return response()->json($otp->send($phone));
    }

    public function verifyOtp(Request $request, OtpService $otp): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string'],
            'code' => ['required', 'string'],
        ]);

        $phone = Phones::normalize($data['phone']);
        $otp->check($phone, $data['code']);

        $user = User::query()->firstOrCreate(
            ['phone' => $phone],
            ['name' => 'عضو طبیار', 'account_status' => 'pending_review'],
        );

        if (in_array($user->account_status, ['suspended', 'revoked'], true)) {
            return response()->json(['message' => 'این حساب '.$user->statusLabel().' است.'], 403);
        }

        $token = $user->createToken('tebyar')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => Present::me($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'خارج شدید.']);
    }

    public function sessions(Request $request): JsonResponse
    {
        $currentId = $request->user()->currentAccessToken()?->id;
        $tokens = $request->user()->tokens()->latest('last_used_at')->latest('created_at')->limit(20)->get();

        return response()->json([
            'data' => $tokens->map(fn ($token) => [
                'id' => $token->id,
                'name' => $token->name,
                'current' => $token->id === $currentId,
                'last_used_at' => $token->last_used_at?->toIso8601String(),
                'created_at' => $token->created_at?->toIso8601String(),
            ])->values(),
        ]);
    }

    public function revokeSession(Request $request, int $tokenId): JsonResponse
    {
        $currentId = $request->user()->currentAccessToken()?->id;
        if ($tokenId === $currentId) {
            return response()->json(['message' => 'نشست فعلی را از گزینه خروج ببندید.'], 422);
        }

        $request->user()->tokens()->whereKey($tokenId)->delete();

        return response()->json(['message' => 'نشست بسته شد.']);
    }
}
