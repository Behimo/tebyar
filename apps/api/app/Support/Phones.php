<?php

namespace App\Support;

class Phones
{
    public static function normalize(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', PatientPrivacy::toEnglishDigits($phone)) ?? '';

        if (str_starts_with($digits, '0098')) {
            $digits = substr($digits, 4);
        }

        if (str_starts_with($digits, '98') && strlen($digits) === 12) {
            $digits = substr($digits, 2);
        }

        if (str_starts_with($digits, '9') && strlen($digits) === 10) {
            $digits = '0'.$digits;
        }

        return $digits;
    }

    public static function valid(string $phone): bool
    {
        return (bool) preg_match('/^09\d{9}$/', $phone);
    }
}
