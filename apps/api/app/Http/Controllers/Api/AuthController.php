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
}
