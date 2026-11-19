<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Community;
use App\Models\PollOption;
use App\Models\Topic;
use App\Services\Alerts;
use App\Support\Membership;
use App\Support\PatientPrivacy;
use App\Support\Present;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CommunityController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $viewer = $request->user();
        $communities = Community::query()->withCount(['members', 'topics'])->orderBy('name')->get();

        return response()->json([
            'data' => $communities->map(fn (Community $community) => $this->card($community, $viewer))->values(),
        ]);
    }

    public function show(Request $request, string $slug): JsonResponse
    {
        $community = Community::query()->where('slug', $slug)->withCount(['members', 'topics'])->firstOrFail();
        $topics = $community->topics()->whereNull('hidden_at')->with(['author', 'community'])->latest()->paginate(20);

        return response()->json([
            'data' => $this->card($community, $request->user()),
            'topics' => $topics->getCollection()->map(fn (Topic $topic) => Present::topic($topic, $request->user()))->values(),
        ]);
    }

    public function follow(Request $request, string $slug): JsonResponse
    {
        $community = Community::query()->where('slug', $slug)->firstOrFail();
        $request->user()->communities()->syncWithoutDetaching([$community->id]);

        return response()->json(['data' => $this->card($community->loadCount(['members', 'topics']), $request->user())]);
    }

    public function unfollow(Request $request, string $slug): JsonResponse
    {
        $community = Community::query()->where('slug', $slug)->firstOrFail();
        $request->user()->communities()->detach($community->id);

        return response()->json(['data' => $this->card($community->loadCount(['members', 'topics']), $request->user())]);
    }

    public function storeTopic(Request $request, string $slug): JsonResponse
    {
        $community = Community::query()->where('slug', $slug)->firstOrFail();
        $user = $request->user();
        $data = $request->validate([
            'kind' => ['required', Rule::in(['discussion', 'case', 'poll'])],
            'title' => ['required', 'string', 'max:180'],
            'body' => ['nullable', 'string', 'max:8000'],
            'anonymous' => ['sometimes', 'boolean'],
            'disclaimer_accepted' => ['sometimes', 'boolean'],
            'options' => ['nullable', 'array', 'min:2', 'max:6'],
            'options.*' => ['string', 'max:160'],
        ]);

        if ($data['kind'] === 'case' && ! Membership::canCreateCase($user)) {
            return response()->json(['message' => 'طرح کیس فقط برای پزشکان دارای پروانه تأییدشده باز است.'], 403);
        }

        if ($data['kind'] === 'poll' && ! Membership::canCreatePoll($user)) {
            return response()->json(['message' => 'نظرسنجی تخصصی فقط برای پزشکان دارای پروانه تأییدشده باز است.'], 403);
        }

        if (! Membership::canUseCommunity($user)) {
            abort(403);
        }

        if (in_array($data['kind'], ['case', 'poll'], true) && empty($data['disclaimer_accepted'])) {
            throw ValidationException::withMessages([
                'disclaimer_accepted' => 'تأیید سلب مسئولیت الزامی است.',
            ]);
        }

        $text = ($data['title'] ?? '').' '.($data['body'] ?? '').' '.implode(' ', $data['options'] ?? []);
        if (PatientPrivacy::containsIdentifier($text)) {
            throw ValidationException::withMessages([
                'body' => 'اطلاعات هویتی، شماره تماس یا کد ملی بیمار را حذف کنید.',
            ]);
        }

        if (Membership::isLearner($user)) {
            $count = Topic::query()->where('user_id', $user->id)->where('created_at', '>=', now()->startOfDay())->count();
            if ($count >= (int) config('tebyar.student_daily_posts')) {
                throw ValidationException::withMessages(['title' => 'سقف انتشار امروز برای حساب دانشجویی پر شده است.']);
            }
        }

        $topic = DB::transaction(function () use ($community, $user, $data) {
            $topic = $community->topics()->create([
                'user_id' => $user->id,
                'kind' => $data['kind'],
                'title' => $data['title'],
                'body' => $data['body'] ?? null,
                'anonymous' => (bool) ($data['anonymous'] ?? false),
                'disclaimer_accepted' => (bool) ($data['disclaimer_accepted'] ?? false),
            ]);

            if ($data['kind'] === 'poll') {
                foreach (array_values($data['options'] ?? []) as $index => $label) {
                    $topic->options()->create(['label' => $label, 'position' => $index]);
                }
            }

            return $topic;
        });

        $topic->load(['author', 'community']);

        return response()->json(['data' => Present::topic($topic, $user)], 201);
    }

    public function showTopic(Request $request, Topic $topic): JsonResponse
    {
        abort_if($topic->hidden_at, 404);
        $topic->load(['author', 'community']);
        $replies = $topic->replies()->whereNull('hidden_at')->whereNull('parent_id')->with('author')->oldest()->get();

        return response()->json([
            'data' => Present::topic($topic, $request->user()),
            'replies' => $replies->map(fn ($reply) => Present::reply($reply, $request->user()))->values(),
        ]);
    }

    public function reply(Request $request, Topic $topic): JsonResponse
    {
        abort_if($topic->hidden_at, 404);
        $data = $request->validate([
            'body' => ['required', 'string', 'max:4000'],
            'parent_id' => ['nullable', 'integer'],
        ]);

        if (PatientPrivacy::containsIdentifier($data['body'])) {
            throw ValidationException::withMessages([
                'body' => 'اطلاعات هویتی، شماره تماس یا کد ملی بیمار را حذف کنید.',
            ]);
        }

        $reply = $topic->replies()->create([
            'user_id' => $request->user()->id,
            'parent_id' => $data['parent_id'] ?? null,
            'body' => $data['body'],
        ]);

        if ($topic->user_id !== $request->user()->id) {
            Alerts::send($topic->author, 'comment', 'پاسخ جدید در انجمن', $request->user()->name.' به موضوع شما پاسخ داد.', '/topics/'.$topic->id);
        }

        $reply->load('author');

        return response()->json(['data' => Present::reply($reply, $request->user())], 201);
    }

    public function vote(Request $request, Topic $topic): JsonResponse
    {
        abort_unless($topic->kind === 'poll' && ! $topic->hidden_at, 404);
        if (! Membership::canCreatePoll($request->user())) {
            return response()->json(['message' => 'رأی دادن در نظرسنجی تخصصی برای پروانه تأییدشده باز است.'], 403);
        }

        $data = $request->validate(['option_id' => ['required', 'integer']]);
        $option = PollOption::query()->where('topic_id', $topic->id)->whereKey($data['option_id'])->first();
        if (! $option) {
            throw ValidationException::withMessages(['option_id' => 'گزینه پیدا نشد.']);
        }

        $topic->votes()->updateOrCreate(
            ['user_id' => $request->user()->id],
            ['poll_option_id' => $option->id],
        );

        $topic->load(['author', 'community']);

        return response()->json(['data' => Present::topic($topic, $request->user())]);
    }

    private function card(Community $community, $viewer): array
    {
        return [
            'id' => $community->id,
            'name' => $community->name,
            'slug' => $community->slug,
            'specialty' => $community->specialty,
            'description' => $community->description,
            'members_count' => $community->members_count ?? $community->members()->count(),
            'topics_count' => $community->topics_count ?? $community->topics()->count(),
            'following' => $viewer->communities()->where('communities.id', $community->id)->exists(),
        ];
    }
}
