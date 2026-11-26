<?php

namespace App\Filament;

class Labels
{
    public static function userRole(?string $role): string
    {
        return match ($role) {
            'student' => 'دانشجو',
            'intern' => 'اینترن',
            'resident' => 'رزیدنت',
            'general' => 'پزشک عمومی',
            'specialist' => 'متخصص',
            'employer' => 'کارفرما',
            default => 'نامشخص',
        };
    }

    public static function userRoleColor(?string $role): string
    {
        return match ($role) {
            'specialist' => 'primary',
            'general', 'resident' => 'info',
            'student', 'intern' => 'gray',
            'employer' => 'warning',
            default => 'gray',
        };
    }

    public static function accountStatus(?string $status): string
    {
        return match ($status) {
            'pending_review' => 'در انتظار بررسی',
            'verified' => 'تأییدشده',
            'needs_correction' => 'نیازمند اصلاح',
            'suspended' => 'تعلیق‌شده',
            'revoked' => 'لغوشده',
            default => $status ?? 'نامشخص',
        };
    }

    public static function accountStatusColor(?string $status): string
    {
        return match ($status) {
            'verified' => 'success',
            'pending_review' => 'warning',
            'needs_correction' => 'info',
            'suspended' => 'gray',
            'revoked' => 'danger',
            default => 'gray',
        };
    }

    public static function staffRole(?string $role): string
    {
        return match ($role) {
            'admin' => 'ادمین',
            'moderator' => 'ناظر',
            'support' => 'پشتیبان',
            default => '—',
        };
    }

    public static function staffRoleColor(?string $role): string
    {
        return match ($role) {
            'admin' => 'danger',
            'moderator' => 'warning',
            'support' => 'info',
            default => 'gray',
        };
    }

    public static function verificationType(?string $type): string
    {
        return match ($type) {
            'education' => 'تحصیلی',
            'license' => 'نظام پزشکی',
            'specialty' => 'تخصص',
            'organization' => 'مرکز درمانی',
            default => $type ?? 'نامشخص',
        };
    }

    public static function verificationStatus(?string $status): string
    {
        return match ($status) {
            'pending' => 'در انتظار',
            'approved' => 'تأییدشده',
            'needs_correction' => 'نیازمند اصلاح',
            'rejected' => 'ردشده',
            'replaced' => 'جایگزین‌شده',
            default => $status ?? 'نامشخص',
        };
    }

    public static function verificationStatusColor(?string $status): string
    {
        return match ($status) {
            'pending' => 'warning',
            'approved' => 'success',
            'needs_correction' => 'info',
            'rejected' => 'danger',
            default => 'gray',
        };
    }

    public static function reportStatus(?string $status): string
    {
        return match ($status) {
            'open' => 'باز',
            'resolved' => 'رسیدگی‌شده',
            'dismissed' => 'ردشده',
            default => $status ?? 'نامشخص',
        };
    }

    public static function reportStatusColor(?string $status): string
    {
        return match ($status) {
            'open' => 'danger',
            'resolved' => 'success',
            'dismissed' => 'gray',
            default => 'gray',
        };
    }

    public static function reportReason(?string $reason): string
    {
        return match ($reason) {
            'spam' => 'هرزنامه',
            'harassment' => 'آزار و توهین',
            'misinformation' => 'اطلاعات نادرست',
            'patient_privacy' => 'نقض حریم بیمار',
            'other' => 'سایر',
            default => $reason ?? 'سایر',
        };
    }

    public static function reportableType(?string $type): string
    {
        return match (class_basename((string) $type)) {
            'Post' => 'پست',
            'Topic' => 'موضوع انجمن',
            'Comment' => 'نظر',
            'User' => 'کاربر',
            'Vacancy' => 'آگهی',
            default => class_basename((string) $type) ?: 'مورد',
        };
    }

    public static function ticketStatus(?string $status): string
    {
        return match ($status) {
            'open' => 'باز',
            'pending' => 'پاسخ داده‌شده',
            'closed' => 'بسته‌شده',
            default => $status ?? 'نامشخص',
        };
    }

    public static function ticketStatusColor(?string $status): string
    {
        return match ($status) {
            'open' => 'danger',
            'pending' => 'warning',
            'closed' => 'success',
            default => 'gray',
        };
    }

    public static function organizationType(?string $type): string
    {
        return match ($type) {
            'hospital' => 'بیمارستان',
            'clinic' => 'کلینیک',
            'teaching' => 'مرکز آموزشی',
            default => $type ?? 'مرکز',
        };
    }

    public static function organizationStatus(?string $status): string
    {
        return match ($status) {
            'pending' => 'در انتظار تأیید',
            'verified' => 'تأییدشده',
            'rejected' => 'ردشده',
            default => $status ?? 'نامشخص',
        };
    }

    public static function organizationStatusColor(?string $status): string
    {
        return match ($status) {
            'verified' => 'success',
            'pending' => 'warning',
            'rejected' => 'danger',
            default => 'gray',
        };
    }

    public static function topicKind(?string $kind): string
    {
        return match ($kind) {
            'case' => 'کیس بالینی',
            'poll' => 'نظرسنجی',
            'discussion' => 'بحث تخصصی',
            default => $kind ?? 'موضوع',
        };
    }

    public static function topicKindColor(?string $kind): string
    {
        return match ($kind) {
            'case' => 'warning',
            'poll' => 'info',
            'discussion' => 'primary',
            default => 'gray',
        };
    }

    public static function employmentType(?string $type): string
    {
        return match ($type) {
            'full_time' => 'تمام‌وقت',
            'part_time' => 'پاره‌وقت',
            'teaching' => 'تدریس',
            'collaboration' => 'همکاری حرفه‌ای',
            default => $type ?? 'نامشخص',
        };
    }

    public static function vacancyStatus(?string $status): string
    {
        return match ($status) {
            'published' => 'منتشرشده',
            'draft' => 'پیش‌نویس',
            'closed' => 'بسته‌شده',
            default => $status ?? 'نامشخص',
        };
    }

    public static function vacancyStatusColor(?string $status): string
    {
        return match ($status) {
            'published' => 'success',
            'draft' => 'gray',
            'closed' => 'danger',
            default => 'gray',
        };
    }

    public static function subscriptionStatus(?string $status): string
    {
        return match ($status) {
            'pending' => 'در انتظار بررسی',
            'active' => 'فعال',
            'rejected' => 'ردشده',
            'cancelled' => 'لغوشده',
            default => $status ?? 'نامشخص',
        };
    }

    public static function subscriptionStatusColor(?string $status): string
    {
        return match ($status) {
            'pending' => 'warning',
            'active' => 'success',
            'rejected' => 'danger',
            'cancelled' => 'gray',
            default => 'gray',
        };
    }
}
