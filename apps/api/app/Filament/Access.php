<?php

namespace App\Filament;

class Access
{
    public static function allows(array $roles): bool
    {
        $role = auth()->user()?->staff_role;

        return in_array($role, $roles, true);
    }
}
