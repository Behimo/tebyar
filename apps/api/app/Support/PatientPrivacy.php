<?php

namespace App\Support;

class PatientPrivacy
{
    public static function toEnglishDigits(string $value): string
    {
        return strtr($value, [
            '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4',
            '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
            '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
            '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
        ]);
    }

    public static function containsIdentifier(string $text): bool
    {
        $text = self::toEnglishDigits($text);

        if (preg_match('/(?<!\d)(?:\+98|0098|98|0)?9\d{9}(?!\d)/', $text)) {
            return true;
        }

        if (str_contains($text, 'کد ملی') || str_contains($text, 'کدملی')) {
            return true;
        }

        if (preg_match_all('/(?<!\d)(\d{10})(?!\d)/', $text, $matches)) {
            foreach ($matches[1] as $candidate) {
                if (self::isNationalId($candidate)) {
                    return true;
                }
            }
        }

        return false;
    }

    public static function isNationalId(string $code): bool
    {
        if (! preg_match('/^\d{10}$/', $code) || preg_match('/^(\d)\1{9}$/', $code)) {
            return false;
        }

        $sum = 0;
        for ($i = 0; $i < 9; $i++) {
            $sum += ((int) $code[$i]) * (10 - $i);
        }

        $remainder = $sum % 11;
        $check = (int) $code[9];

        return ($remainder < 2 && $check === $remainder)
            || ($remainder >= 2 && $check === (11 - $remainder));
    }
}
