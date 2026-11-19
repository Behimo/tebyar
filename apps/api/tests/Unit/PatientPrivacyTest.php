<?php

namespace Tests\Unit;

use App\Support\PatientPrivacy;
use PHPUnit\Framework\TestCase;

class PatientPrivacyTest extends TestCase
{
    public function test_it_flags_phone_numbers_and_valid_national_ids(): void
    {
        $this->assertTrue(PatientPrivacy::containsIdentifier('تماس با ۰۹۱۲۱۲۳۴۵۶۷'));
        $this->assertTrue(PatientPrivacy::containsIdentifier('کد ملی را حذف کنید'));
        $this->assertFalse(PatientPrivacy::containsIdentifier('فشار خون ۱۲۰ روی ۸۰ و نبض ۹۰'));

        $base = '049937089';
        $sum = 0;
        for ($i = 0; $i < 9; $i++) {
            $sum += ((int) $base[$i]) * (10 - $i);
        }
        $remainder = $sum % 11;
        $check = $remainder < 2 ? $remainder : 11 - $remainder;

        $this->assertTrue(PatientPrivacy::containsIdentifier('پرونده '.$base.$check));
    }
}
