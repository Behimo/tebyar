<?php

namespace App\Support;

use App\Models\User;

class Membership
{
    public const LEARNERS = ['student', 'intern'];

    public const LICENSED = ['resident', 'general', 'specialist'];

    public const MEDICAL = ['student', 'intern', 'resident', 'general', 'specialist'];

    public static function isLearner(User $user): bool
    {
        return in_array($user->role, self::LEARNERS, true);
    }

    public static function isLicensed(User $user): bool
    {
        return in_array($user->role, self::LICENSED, true) && $user->license_verified_at !== null;
    }

    public static function canUseCommunity(User $user): bool
    {
        return $user->account_status === 'verified' && in_array($user->role, self::MEDICAL, true);
    }

    public static function canPostSocial(User $user): bool
    {
        return self::canUseCommunity($user);
    }

    public static function canCreateCase(User $user): bool
    {
        return self::isLicensed($user) && $user->account_status === 'verified';
    }

    public static function canCreatePoll(User $user): bool
    {
        return self::canCreateCase($user);
    }
}
