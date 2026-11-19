<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProfileEntry;
use App\Models\User;
use App\Services\VerificationService;
use App\Support\Membership;
use App\Support\PatientPrivacy;
use App\Support\Present;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function me(Request $request): JsonResponse
    {
        return response()->json(['data' => Present::me($request->user())]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $this->ensureMedical($user);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:80'],
            'headline' => ['nullable', 'string', 'max:160'],
            'bio' => ['nullable', 'string', 'max:2000'],
            'city' => ['nullable', 'string', 'max:80'],
            'specialty_title' => ['nullable', 'string', 'max:120'],
            'privacy_dm' => ['sometimes', Rule::in(['everyone', 'following', 'none'])],
            'notify_interactions' => ['sometimes', 'boolean'],
            'notify_messages' => ['sometimes', 'boolean'],
        ]);

        $user->fill($data)->save();

        return response()->json(['data' => Present::me($user->fresh())]);
    }

    public function avatar(Request $request): JsonResponse
    {
        $this->ensureMedical($request->user());
        $request->validate([
            'avatar' => ['required', 'image', 'max:4096'],
        ], ['avatar.required' => 'تصویر پروفایل را انتخاب کنید.']);

        $path = $request->file('avatar')->store('avatars', 'public');
        $request->user()->forceFill(['avatar_path' => $path])->save();

        return response()->json(['data' => Present::me($request->user()->fresh())]);
    }

    public function onboarding(Request $request, VerificationService $verification): JsonResponse
    {
        $user = $request->user();

        if ($user->account_status === 'verified' && $request->input('role') !== 'specialty') {
            throw ValidationException::withMessages([
                'role' => 'حساب شما قبلاً تأیید شده است.',
            ]);
        }

        $data = $request->validate([
            'role' => ['required', Rule::in(['student', 'intern', 'resident', 'general', 'specialist', 'employer'])],
            'name' => ['required', 'string', 'max:80'],
            'city' => ['nullable', 'string', 'max:80'],
            'specialty_title' => ['nullable', 'string', 'max:120'],
            'university' => ['nullable', 'string', 'max:160'],
            'student_number' => ['nullable', 'string', 'max:40'],
            'national_id' => ['nullable', 'string', 'max:20'],
            'medical_council_number' => ['nullable', 'string', 'max:20'],
            'organization_name' => ['nullable', 'string', 'max:160'],
            'organization_type' => ['nullable', Rule::in(['clinic', 'hospital', 'teaching'])],
            'about' => ['nullable', 'string', 'max:2000'],
            'document' => [
                Rule::requiredIf(fn () => $request->input('role') === 'employer'),
                'nullable',
                'file',
                'mimes:jpg,jpeg,png,pdf,webp',
                'max:8192',
            ],
        ], [
            'document.required' => 'مدرک مرکز درمانی را بارگذاری کنید.',
        ]);

        if (! empty($data['national_id'])) {
            $nationalId = PatientPrivacy::toEnglishDigits($data['national_id']);
            if (! PatientPrivacy::isNationalId($nationalId)) {
                throw ValidationException::withMessages(['national_id' => 'کد ملی معتبر نیست.']);
            }
            $data['national_id'] = $nationalId;
        }

        if (in_array($data['role'], Membership::LEARNERS, true) && empty($data['student_number'])) {
            throw ValidationException::withMessages(['student_number' => 'شماره دانشجویی الزامی است.']);
        }

        if (in_array($data['role'], Membership::LICENSED, true) && empty($data['medical_council_number'])) {
            throw ValidationException::withMessages(['medical_council_number' => 'شماره نظام پزشکی الزامی است.']);
        }

        if ($data['role'] === 'employer' && (empty($data['organization_name']) || empty($data['organization_type']) || empty($data['city']))) {
            throw ValidationException::withMessages(['organization_name' => 'نام، نوع و شهر مرکز درمانی را کامل کنید.']);
        }

        $verification->submitProfile($user, $data, $request->file('document'));

        return response()->json(['data' => Present::me($user->fresh())]);
    }

    public function specialty(Request $request, VerificationService $verification): JsonResponse
    {
        $user = $request->user();
        if (! Membership::isLicensed($user)) {
            return response()->json(['message' => 'تأیید تخصص فقط برای پروانه تأییدشده است.'], 403);
        }

        $data = $request->validate([
            'specialty_title' => ['required', 'string', 'max:120'],
            'document' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf,webp', 'max:8192'],
        ]);

        $verification->submitSpecialty($user, $data['specialty_title'], $request->file('document'));

        return response()->json(['data' => Present::me($user->fresh())]);
    }

    public function verification(Request $request): JsonResponse
    {
        return response()->json(['data' => Present::me($request->user())['verification']]);
    }

    public function show(Request $request, string $slug): JsonResponse
    {
        $user = User::query()
            ->where('slug', $slug)
            ->where('account_status', 'verified')
            ->whereIn('role', Membership::MEDICAL)
            ->withCount(['followers', 'following', 'posts'])
            ->firstOrFail();

        return response()->json([
            'data' => Present::user($user, $request->user(), true),
            'posts' => $user->posts()->visible()->with(['author', 'media', 'hashtags'])->withCount(['reactions', 'comments', 'reposts'])->withViewerState($request->user())->latest('posts.created_at')->limit(12)->get()
                ->map(fn ($post) => Present::post($post, $request->user()))
                ->values(),
        ]);
    }

    public function follow(Request $request, User $user): JsonResponse
    {
        $viewer = $request->user();
        if ($viewer->id === $user->id || $user->account_status !== 'verified') {
            return response()->json(['message' => 'دنبال کردن ممکن نیست.'], 422);
        }

        $viewer->following()->syncWithoutDetaching([$user->id]);
        \App\Services\Alerts::send($user, 'follow', 'دنبال‌کننده جدید', $viewer->name.' شما را دنبال کرد.', '/doctors/'.$viewer->slug);

        return response()->json(['data' => Present::user($user->loadCount(['followers', 'following', 'posts']), $viewer, true)]);
    }

    public function unfollow(Request $request, User $user): JsonResponse
    {
        $request->user()->following()->detach($user->id);

        return response()->json(['data' => Present::user($user->loadCount(['followers', 'following', 'posts']), $request->user(), true)]);
    }

    public function storeEntry(Request $request): JsonResponse
    {
        $this->ensureMedical($request->user());
        $data = $request->validate([
            'kind' => ['required', Rule::in(['education', 'experience', 'publication', 'certificate', 'talk', 'skill'])],
            'title' => ['required', 'string', 'max:160'],
            'subtitle' => ['nullable', 'string', 'max:160'],
            'body' => ['nullable', 'string', 'max:2000'],
            'year' => ['nullable', 'string', 'max:12'],
        ]);

        $request->user()->entries()->create($data);

        return response()->json(['data' => Present::me($request->user())]);
    }

    public function destroyEntry(Request $request, ProfileEntry $entry): JsonResponse
    {
        abort_unless($entry->user_id === $request->user()->id, 403);
        $entry->delete();

        return response()->json(['data' => Present::me($request->user())]);
    }

    private function ensureMedical(User $user): void
    {
        if ($user->account_status !== 'verified' || ! in_array($user->role, Membership::MEDICAL, true)) {
            abort(403, 'پروفایل عمومی پس از تأیید عضویت فعال می‌شود.');
        }
    }
}
