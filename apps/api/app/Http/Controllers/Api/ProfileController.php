<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProfileEntry;
use App\Models\ProfileView;
use App\Models\User;
use App\Services\Alerts;
use App\Services\VerificationService;
use App\Support\MediaStore;
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
            'privacy_mentions' => ['sometimes', Rule::in(['everyone', 'following', 'none'])],
            'show_read_receipts' => ['sometimes', 'boolean'],
            'open_to_work' => ['sometimes', 'boolean'],
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
            'avatar' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,heic,heif', 'max:4096'],
        ], ['avatar.required' => 'تصویر پروفایل را انتخاب کنید.']);

        $path = MediaStore::storePublic($request->file('avatar'), 'avatars', $request->user()->id);
        $request->user()->forceFill(['avatar_path' => $path])->save();

        return response()->json(['data' => Present::me($request->user()->fresh())]);
    }

    public function onboarding(Request $request, VerificationService $verification): JsonResponse
    {
        $user = $request->user();

        $upgradeToProfessional = $user->account_status === 'verified'
            && Membership::isRestricted($user)
            && in_array($request->input('role'), Membership::PROFESSIONALS, true);

        if ($user->account_status === 'verified' && ! $upgradeToProfessional) {
            throw ValidationException::withMessages([
                'role' => 'حساب شما قبلاً تأیید شده است.',
            ]);
        }

        $data = $request->validate([
            'role' => ['required', Rule::in(array_merge(Membership::PROFESSIONALS, ['student', 'public', 'employer']))],
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

        if (in_array($data['role'], Membership::PROFESSIONALS, true) && empty($data['medical_council_number'])) {
            throw ValidationException::withMessages(['medical_council_number' => 'شماره نظام (کد نظام حرفه‌ای) الزامی است.']);
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
            ->whereIn('role', Membership::MEMBERS)
            ->withCount(['followers', 'following', 'posts'])
            ->firstOrFail();

        $viewer = $request->user();
        if ($viewer->id !== $user->id) {
            $today = now()->toDateString();
            $existing = ProfileView::query()
                ->where('profile_id', $user->id)
                ->where('viewer_id', $viewer->id)
                ->whereDate('viewed_on', $today)
                ->first();

            if ($existing) {
                $existing->increment('views');
            } else {
                ProfileView::query()->create([
                    'profile_id' => $user->id,
                    'viewer_id' => $viewer->id,
                    'viewed_on' => $today,
                    'views' => 1,
                ]);
            }
        }

        $postQuery = fn () => $user->posts()->visible()->visibleTo($viewer)
            ->with(['author', 'media', 'hashtags', 'original.author', 'original.media', 'original.hashtags'])
            ->withCount(['reactions', 'comments', 'reposts'])
            ->withViewerState($viewer)
            ->latest('posts.created_at');

        return response()->json([
            'data' => Present::user($user, $viewer, true),
            'posts' => $postQuery()->where('type', '!=', 'repost')->limit(24)->get()
                ->map(fn ($post) => Present::post($post, $viewer))
                ->values(),
            'reposts' => $postQuery()->where('type', 'repost')->limit(24)->get()
                ->map(fn ($post) => Present::post($post, $viewer))
                ->values(),
            'topics' => $user->topics()->whereNull('topics.hidden_at')->visibleTo($viewer)->with(['author', 'community'])->withCount('replies')->latest()->limit(12)->get()
                ->map(fn ($topic) => Present::topic($topic, $viewer))
                ->values(),
            'communities' => $user->communities()->withCount(['members', 'topics'])->get()->map(fn ($community) => [
                'id' => $community->id,
                'name' => $community->name,
                'slug' => $community->slug,
                'specialty' => $community->specialty,
                'description' => $community->description,
                'members_count' => $community->members_count,
                'topics_count' => $community->topics_count,
                'following' => true,
            ])->values(),
        ]);
    }

    public function follow(Request $request, User $user): JsonResponse
    {
        $viewer = $request->user();
        if ($viewer->id === $user->id || $user->account_status !== 'verified') {
            return response()->json(['message' => 'دنبال کردن ممکن نیست.'], 422);
        }

        $viewer->following()->syncWithoutDetaching([$user->id]);
        Alerts::send($user, 'follow', 'دنبال‌کننده جدید', $viewer->name.' شما را دنبال کرد.', '/doctors/'.$viewer->slug);

        return response()->json(['data' => Present::user($user->loadCount(['followers', 'following', 'posts']), $viewer, true)]);
    }

    public function unfollow(Request $request, User $user): JsonResponse
    {
        $request->user()->following()->detach($user->id);

        return response()->json(['data' => Present::user($user->loadCount(['followers', 'following', 'posts']), $request->user(), true)]);
    }

    public function followers(Request $request, User $user): JsonResponse
    {
        $viewer = $request->user();
        $hidden = Present::hiddenIds($viewer);
        $list = $user->followers()
            ->where('account_status', 'verified')
            ->when($hidden !== [], fn ($q) => $q->whereNotIn('users.id', $hidden))
            ->orderBy('name')
            ->limit(100)
            ->get();

        return response()->json([
            'data' => $list->map(fn (User $person) => Present::user($person, $viewer))->values(),
        ]);
    }

    public function following(Request $request, User $user): JsonResponse
    {
        $viewer = $request->user();
        $hidden = Present::hiddenIds($viewer);
        $list = $user->following()
            ->where('account_status', 'verified')
            ->when($hidden !== [], fn ($q) => $q->whereNotIn('users.id', $hidden))
            ->orderBy('name')
            ->limit(100)
            ->get();

        return response()->json([
            'data' => $list->map(fn (User $person) => Present::user($person, $viewer))->values(),
        ]);
    }

    public function storeEntry(Request $request): JsonResponse
    {
        if (! Membership::isProfessional($request->user())) {
            abort(403, 'این بخش مخصوص اعضای حرفه‌ای است.');
        }
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
        if (! Membership::isActiveMember($user)) {
            abort(403, 'پروفایل عمومی پس از تأیید عضویت فعال می‌شود.');
        }
    }
}
