<?php

namespace App\Services;

use App\Models\Organization;
use App\Models\User;
use App\Models\UserIdentity;
use App\Models\VerificationRequest;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class VerificationService
{
    public function submitProfile(User $user, array $data, ?UploadedFile $document): VerificationRequest
    {
        return DB::transaction(function () use ($user, $data, $document) {
            $role = $data['role'];
            $user->fill([
                'name' => $data['name'],
                'role' => $role,
                'city' => $data['city'] ?? null,
                'specialty_title' => $data['specialty_title'] ?? null,
                'account_status' => 'pending_review',
            ])->save();

            if ($role === 'employer') {
                $path = $document?->store('organizations', 'identity');
                Organization::query()->updateOrCreate(
                    ['owner_id' => $user->id],
                    [
                        'name' => $data['organization_name'],
                        'type' => $data['organization_type'],
                        'city' => $data['city'],
                        'about' => $data['about'] ?? null,
                        'status' => 'pending',
                        'document_path' => $path,
                    ],
                );

                return $this->open($user, 'organization', [
                    'name' => $data['organization_name'],
                    'type' => $data['organization_type'],
                ]);
            }

            $identity = UserIdentity::query()->firstOrNew(['user_id' => $user->id]);
            $identity->fill([
                'university' => $data['university'] ?? null,
                'student_number' => $data['student_number'] ?? null,
                'national_id' => $data['national_id'] ?? null,
                'medical_council_number' => $data['medical_council_number'] ?? null,
            ]);

            if ($document) {
                $identity->document_path = $document->store('members', 'identity');
            }

            $identity->save();

            $type = in_array($role, ['student', 'intern'], true) ? 'education' : 'license';

            return $this->open($user, $type, ['role' => $role]);
        });
    }

    public function submitSpecialty(User $user, string $title, UploadedFile $document): VerificationRequest
    {
        $user->specialty_title = $title;
        $user->save();

        $path = $document->store('specialty', 'identity');

        return $this->open($user, 'specialty', [
            'specialty_title' => $title,
            'document_path' => $path,
        ]);
    }

    public function decide(VerificationRequest $request, User $actor, string $decision, ?string $note = null): void
    {
        if ($actor->staff_role !== 'admin') {
            throw ValidationException::withMessages([
                'decision' => 'فقط ادمین می‌تواند احراز را تعیین تکلیف کند.',
            ]);
        }

        $status = match ($decision) {
            'approve' => 'approved',
            'correction' => 'needs_correction',
            default => 'rejected',
        };

        $request->forceFill([
            'status' => $status,
            'reviewer_id' => $actor->id,
            'note' => $note,
            'reviewed_at' => now(),
        ])->save();

        $user = $request->user()->firstOrFail();

        if ($decision === 'approve') {
            $now = now();
            if ($request->type === 'education') {
                $user->education_verified_at = $now;
                $user->account_status = 'verified';
            } elseif ($request->type === 'license') {
                $user->identity_verified_at = $now;
                $user->license_verified_at = $now;
                $user->account_status = 'verified';
            } elseif ($request->type === 'specialty') {
                $user->specialty_verified_at = $now;
                if ($request->payload['specialty_title'] ?? null) {
                    $user->specialty_title = $request->payload['specialty_title'];
                }
            } elseif ($request->type === 'organization') {
                $user->organization()->update(['status' => 'verified']);
                $user->account_status = 'verified';
            }
            $user->save();
            Alerts::send($user, 'verification', 'حساب شما تأیید شد', 'می‌توانید وارد جامعه طبیار شوید.', '/');
        } elseif ($decision === 'correction') {
            if (! ($request->type === 'specialty' && $user->account_status === 'verified')) {
                $user->account_status = 'needs_correction';
                $user->save();
            }
            Alerts::send($user, 'verification', 'اطلاعات نیاز به اصلاح دارد', $note ?: 'مدارک را دوباره ارسال کنید.', '/join');
        } elseif ($request->type === 'organization') {
            $user->organization()->update(['status' => 'rejected']);
        }

        AuditLogger::record($actor, 'verification.'.$status, $request, ['note' => $note, 'user_id' => $user->id]);
    }

    public function setAccountStatus(User $user, User $actor, string $status, ?string $note = null): void
    {
        if ($actor->staff_role !== 'admin') {
            throw ValidationException::withMessages(['status' => 'فقط ادمین می‌تواند وضعیت حساب را تغییر دهد.']);
        }

        $user->account_status = $status;
        $user->save();
        AuditLogger::record($actor, 'account.'.$status, $user, ['note' => $note]);

        if (in_array($status, ['suspended', 'revoked', 'needs_correction'], true)) {
            Alerts::send($user, 'account', 'وضعیت حساب تغییر کرد', $user->statusLabel().($note ? ' — '.$note : ''), '/pending');
        }
    }

    private function open(User $user, string $type, array $payload): VerificationRequest
    {
        VerificationRequest::query()
            ->where('user_id', $user->id)
            ->where('type', $type)
            ->where('status', 'pending')
            ->update(['status' => 'replaced']);

        return VerificationRequest::query()->create([
            'user_id' => $user->id,
            'type' => $type,
            'status' => 'pending',
            'payload' => $payload,
        ]);
    }
}
