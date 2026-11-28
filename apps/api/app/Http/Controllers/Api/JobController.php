<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SavedVacancy;
use App\Models\Vacancy;
use App\Models\VacancyApplication;
use App\Services\Alerts;
use App\Support\Membership;
use App\Support\Present;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

class JobController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Vacancy::query()
            ->where('status', 'published')
            ->whereNull('hidden_at')
            ->whereHas('organization', fn ($q) => $q->where('status', 'verified'));

        if ($specialty = $request->string('specialty')->toString()) {
            $query->where('specialty', 'like', '%'.$specialty.'%');
        }
        if ($city = $request->string('city')->toString()) {
            $query->where('city', 'like', '%'.$city.'%');
        }
        if ($type = $request->string('employment_type')->toString()) {
            $query->where('employment_type', $type);
        }

        $vacancies = $query->with('organization')->latest()->paginate(20);

        return response()->json([
            'data' => $vacancies->getCollection()->map(fn (Vacancy $vacancy) => Present::vacancy($vacancy, $request->user()))->values(),
        ]);
    }

    public function show(Request $request, Vacancy $vacancy): JsonResponse
    {
        abort_if($vacancy->hidden_at || $vacancy->status !== 'published', 404);
        $vacancy->load('organization');

        return response()->json(['data' => Present::vacancy($vacancy, $request->user())]);
    }

    public function save(Request $request, Vacancy $vacancy): JsonResponse
    {
        SavedVacancy::query()->firstOrCreate([
            'user_id' => $request->user()->id,
            'vacancy_id' => $vacancy->id,
        ]);

        return response()->json(['message' => 'آگهی ذخیره شد.']);
    }

    public function unsave(Request $request, Vacancy $vacancy): JsonResponse
    {
        SavedVacancy::query()->where('user_id', $request->user()->id)->where('vacancy_id', $vacancy->id)->delete();

        return response()->json(['message' => 'آگهی از ذخیره‌ها خارج شد.']);
    }

    public function apply(Request $request, Vacancy $vacancy): JsonResponse
    {
        $user = $request->user();
        abort_if($vacancy->hidden_at || $vacancy->status !== 'published', 404);
        if (! Membership::canUseJobs($user)) {
            abort(403);
        }

        $data = $request->validate([
            'cover_letter' => ['nullable', 'string', 'max:4000'],
            'resume' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:8192'],
        ]);

        $payload = [
            'cover_letter' => $data['cover_letter'] ?? null,
            'status' => 'submitted',
        ];

        if ($request->hasFile('resume')) {
            $payload['resume_path'] = $request->file('resume')->store('resumes', 'local');
        }

        $application = VacancyApplication::query()->updateOrCreate(
            ['vacancy_id' => $vacancy->id, 'user_id' => $user->id],
            $payload,
        );

        $owner = $vacancy->organization->owner;
        Alerts::send($owner, 'application', 'درخواست همکاری جدید', $user->name.' برای «'.$vacancy->title.'» درخواست داد.', '/employer');

        return response()->json([
            'data' => [
                'id' => $application->id,
                'status' => $application->status,
                'vacancy' => Present::vacancy($vacancy->load('organization'), $user),
            ],
        ], 201);
    }

    public function mine(Request $request): JsonResponse
    {
        $org = $request->user()->organization;
        $vacancies = $org->vacancies()->with('organization')->latest()->get();

        return response()->json([
            'data' => $vacancies->map(fn (Vacancy $vacancy) => [
                ...Present::vacancy($vacancy, $request->user()),
                'applications_count' => $vacancy->applications()->count(),
            ])->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:180'],
            'specialty' => ['required', 'string', 'max:120'],
            'city' => ['required', 'string', 'max:80'],
            'employment_type' => ['required', Rule::in(['full_time', 'part_time', 'teaching', 'collaboration'])],
            'description' => ['required', 'string', 'max:8000'],
        ]);

        $vacancy = $request->user()->organization->vacancies()->create($data + ['status' => 'published']);
        $vacancy->load('organization');

        return response()->json(['data' => Present::vacancy($vacancy, $request->user())], 201);
    }

    public function applications(Request $request, Vacancy $vacancy): JsonResponse
    {
        abort_unless($vacancy->organization->owner_id === $request->user()->id, 403);
        $applications = $vacancy->applications()->with('applicant')->latest()->get();

        return response()->json([
            'data' => $applications->map(fn (VacancyApplication $application) => [
                'id' => $application->id,
                'status' => $application->status,
                'cover_letter' => $application->cover_letter,
                'has_resume' => (bool) $application->resume_path,
                'created_at' => $application->created_at?->toIso8601String(),
                'applicant' => Present::user($application->applicant, $request->user()),
            ])->values(),
        ]);
    }

    public function updateApplication(Request $request, VacancyApplication $application): JsonResponse
    {
        abort_unless($application->vacancy->organization->owner_id === $request->user()->id, 403);
        $data = $request->validate([
            'status' => ['required', Rule::in(['reviewing', 'accepted', 'rejected'])],
        ]);
        $application->status = $data['status'];
        $application->save();

        $label = match ($data['status']) {
            'reviewing' => 'در حال بررسی',
            'accepted' => 'پذیرفته شد',
            'rejected' => 'پذیرفته نشد',
            default => $data['status'],
        };
        Alerts::send($application->applicant, 'application', 'وضعیت درخواست همکاری', 'درخواست شما '.$label.'.', '/jobs/'.$application->vacancy_id);

        return response()->json(['data' => ['id' => $application->id, 'status' => $application->status]]);
    }

    public function resume(Request $request, VacancyApplication $application): StreamedResponse
    {
        $user = $request->user();
        $owns = $application->vacancy->organization->owner_id === $user->id;
        abort_unless($owns || $application->user_id === $user->id, 403);
        abort_unless($application->resume_path, 404);

        return Storage::disk('local')->download($application->resume_path);
    }
}
