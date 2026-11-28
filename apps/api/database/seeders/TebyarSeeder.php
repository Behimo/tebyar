<?php

namespace Database\Seeders;

use App\Models\Bookmark;
use App\Models\Comment;
use App\Models\Community;
use App\Models\Conversation;
use App\Models\Hashtag;
use App\Models\Organization;
use App\Models\Post;
use App\Models\PostView;
use App\Models\ProfileView;
use App\Models\Reaction;
use App\Models\Story;
use App\Models\Topic;
use App\Models\User;
use App\Models\Vacancy;
use App\Models\VacancyApplication;
use App\Notifications\UserAlert;
use Illuminate\Database\Seeder;

class TebyarSeeder extends Seeder
{
    public function run(): void
    {
        $admin = $this->person([
            'name' => 'مدیر طبیار',
            'email' => 'admin@tebyar.test',
            'phone' => '09120000001',
            'slug' => 'admin',
            'role' => 'general',
            'staff_role' => 'admin',
            'specialty_title' => 'پزشک عمومی',
            'city' => 'تهران',
            'identity_verified_at' => now(),
            'license_verified_at' => now(),
        ]);

        $this->person([
            'name' => 'پشتیبان طبیار',
            'email' => 'support@tebyar.test',
            'phone' => '09120000002',
            'slug' => 'support',
            'role' => 'general',
            'staff_role' => 'support',
            'specialty_title' => 'پزشک عمومی',
            'city' => 'تهران',
            'identity_verified_at' => now(),
            'license_verified_at' => now(),
        ]);

        $this->person([
            'name' => 'ناظر محتوا',
            'email' => 'moderator@tebyar.test',
            'phone' => '09120000003',
            'slug' => 'moderator',
            'role' => 'general',
            'staff_role' => 'moderator',
            'specialty_title' => 'پزشک عمومی',
            'city' => 'تهران',
            'identity_verified_at' => now(),
            'license_verified_at' => now(),
        ]);

        $rezaei = $this->person([
            'name' => 'دکتر محمد رضایی',
            'phone' => '09121000011',
            'slug' => 'mohammad-rezaei',
            'role' => 'specialist',
            'specialty_title' => 'متخصص قلب و عروق',
            'headline' => 'هیئت علمی، بیمارستان قلب تهران',
            'bio' => 'علاقه‌مند به گفت‌وگوی بین‌رشته‌ای و آموزش دستیاران.',
            'city' => 'تهران',
            'identity_verified_at' => now(),
            'license_verified_at' => now(),
            'specialty_verified_at' => now(),
            'pro_until' => now()->addYear(),
        ]);

        $karimi = $this->person([
            'name' => 'دکتر سارا کریمی',
            'phone' => '09121000012',
            'slug' => 'sara-karimi',
            'role' => 'specialist',
            'specialty_title' => 'متخصص پوست',
            'headline' => 'درمانگاه پوست، تهران',
            'city' => 'تهران',
            'bio' => 'درباره تجربه بالینی پوست می‌نویسم، نه توصیه درمانی برای بیمار.',
            'identity_verified_at' => now(),
            'license_verified_at' => now(),
            'specialty_verified_at' => now(),
        ]);

        $ahmadi = $this->person([
            'name' => 'دکتر علی احمدی',
            'phone' => '09121000013',
            'slug' => 'ali-ahmadi',
            'role' => 'specialist',
            'specialty_title' => 'متخصص داخلی',
            'headline' => 'بیمارستان الزهرا، اصفهان',
            'city' => 'اصفهان',
            'identity_verified_at' => now(),
            'license_verified_at' => now(),
            'specialty_verified_at' => now(),
        ]);

        $nouri = $this->person([
            'name' => 'دکتر رضا نوری',
            'phone' => '09121000014',
            'slug' => 'reza-nouri',
            'role' => 'resident',
            'specialty_title' => 'رزیدنت جراحی',
            'city' => 'شیراز',
            'identity_verified_at' => now(),
            'license_verified_at' => now(),
        ]);

        $student = $this->person([
            'name' => 'نیلوفر محمدی',
            'phone' => '09121000015',
            'slug' => 'niloufar',
            'role' => 'student',
            'specialty_title' => 'دانشجوی پزشکی',
            'headline' => 'دانشگاه علوم پزشکی تهران',
            'city' => 'تهران',
            'education_verified_at' => now(),
            'license_verified_at' => null,
            'identity_verified_at' => null,
        ]);

        $this->person([
            'name' => 'کسری مرادی',
            'phone' => '09121000016',
            'slug' => 'kasra',
            'role' => 'intern',
            'specialty_title' => 'اینترن',
            'city' => 'مشهد',
            'education_verified_at' => now(),
            'license_verified_at' => null,
            'identity_verified_at' => null,
        ]);

        $this->person([
            'name' => 'دکتر مریم صادقی',
            'phone' => '09121000017',
            'slug' => 'maryam-sadeghi',
            'role' => 'pharmacist',
            'specialty_title' => 'داروساز',
            'headline' => 'داروخانه شبانه‌روزی، تهران',
            'city' => 'تهران',
            'identity_verified_at' => now(),
            'license_verified_at' => now(),
        ]);

        $this->person([
            'name' => 'زهرا حسینی',
            'phone' => '09121000018',
            'slug' => 'zahra-hosseini',
            'role' => 'nurse',
            'specialty_title' => 'پرستار بخش',
            'headline' => 'بیمارستان آتیه، کرج',
            'city' => 'کرج',
            'identity_verified_at' => now(),
            'license_verified_at' => now(),
        ]);

        $this->person([
            'name' => 'دکتر امید کاظمی',
            'phone' => '09121000019',
            'slug' => 'omid-kazemi',
            'role' => 'veterinarian',
            'specialty_title' => 'دامپزشک',
            'headline' => 'کلینیک دامپزشکی، تبریز',
            'city' => 'تبریز',
            'identity_verified_at' => now(),
            'license_verified_at' => now(),
        ]);

        $this->person([
            'name' => 'سارینا احمدی',
            'phone' => '09121000020',
            'slug' => 'sarina',
            'role' => 'public',
            'city' => 'رشت',
            'license_verified_at' => null,
            'identity_verified_at' => null,
        ]);

        $employer = $this->person([
            'name' => 'روابط علمی مرکز درمان تهران',
            'email' => 'jobs@tebyar.test',
            'phone' => '09121000031',
            'slug' => 'tehran-center',
            'role' => 'employer',
            'city' => 'تهران',
            'license_verified_at' => null,
            'identity_verified_at' => null,
        ]);

        $org = Organization::query()->updateOrCreate(['owner_id' => $employer->id], [
            'name' => 'مرکز درمانی نمونه تهران',
            'type' => 'hospital',
            'city' => 'تهران',
            'about' => 'مرکز نمایشی برای آگهی‌های ساختگی. استخدام واقعی انجام نمی‌شود.',
            'status' => 'verified',
        ]);

        $rezaei->entries()->firstOrCreate(['kind' => 'experience', 'title' => 'هیئت علمی قلب'], [
            'subtitle' => 'بیمارستان قلب تهران',
            'year' => '۱۳۹۸',
        ]);
        $rezaei->entries()->firstOrCreate(['kind' => 'education', 'title' => 'تخصص قلب و عروق'], [
            'subtitle' => 'دانشگاه علوم پزشکی تهران',
            'year' => '۱۳۹۴',
        ]);

        $heart = Community::query()->updateOrCreate(['slug' => 'cardiology'], [
            'name' => 'انجمن قلب و عروق',
            'specialty' => 'قلب و عروق',
            'description' => 'گفت‌وگوی همکاران درباره تجربه بالینی قلب. محتوا توصیه درمانی نیست.',
        ]);
        Community::query()->updateOrCreate(['slug' => 'dermatology'], [
            'name' => 'انجمن پوست',
            'specialty' => 'پوست',
            'description' => 'تبادل تجربه متخصصان پوست.',
        ]);
        Community::query()->updateOrCreate(['slug' => 'internal'], [
            'name' => 'انجمن داخلی',
            'specialty' => 'داخلی',
            'description' => 'بحث‌های داخلی و بین‌رشته‌ای.',
        ]);
        Community::query()->updateOrCreate(['slug' => 'surgery'], [
            'name' => 'انجمن جراحی',
            'specialty' => 'جراحی',
            'description' => 'تجربه اتاق عمل و مراقبت پس از جراحی.',
        ]);
        Community::query()->updateOrCreate(['slug' => 'general'], [
            'name' => 'پزشکی عمومی',
            'specialty' => 'پزشکی عمومی',
            'description' => 'فضای مشترک پزشکان عمومی.',
        ]);
        Community::query()->updateOrCreate(['slug' => 'pharmacy'], [
            'name' => 'انجمن داروسازی',
            'specialty' => 'داروسازی',
            'description' => 'گفت‌وگوی داروسازان درباره داروها، تداخل‌ها و تجربه داروخانه.',
        ]);
        Community::query()->updateOrCreate(['slug' => 'nursing'], [
            'name' => 'انجمن پرستاری',
            'specialty' => 'پرستاری',
            'description' => 'تبادل تجربه پرستاران در مراقبت بالینی و کار بخش.',
        ]);
        Community::query()->updateOrCreate(['slug' => 'veterinary'], [
            'name' => 'انجمن دامپزشکی',
            'specialty' => 'دامپزشکی',
            'description' => 'فضای تخصصی دامپزشکان برای مرور تجربه‌های بالینی دامی.',
        ]);
        Community::query()->updateOrCreate(['slug' => 'public-health'], [
            'name' => 'پرسش‌های عمومی سلامت',
            'specialty' => 'سلامت عمومی',
            'description' => 'فضای پرسش عمومی مردم و دانشجویان؛ پاسخ‌ها توصیه درمانی نیست.',
        ]);

        if (! Post::query()->where('is_demo', true)->exists()) {
            $post = $rezaei->posts()->create([
                'type' => 'text',
                'is_demo' => true,
                'body' => 'امروز تجربه جالبی از همکاری بین‌رشته‌ای در بیمارستان داشتیم. گاهی بهترین نتایج درمانی حاصل گفت‌وگوی درست بین تخصص‌های مختلف است. #قلب #همکاری',
            ]);
            $karimi->posts()->create([
                'type' => 'text',
                'is_demo' => true,
                'body' => 'هفته آینده یک جلسه مرور کیس‌های ساختگی پوست داریم. اگر همکار پوست هستید، در انجمن پوست سر بزنید. این پست توصیه درمانی نیست.',
            ]);
            $ahmadi->posts()->create([
                'type' => 'link',
                'is_demo' => true,
                'link_url' => 'https://tebyar.test/articles/demo',
                'link_title' => 'یادداشت نمایشی: گفت‌وگوی صبحگاهی بخش داخلی',
                'body' => 'لینک ساختگی برای نمایش کارت مقاله. محتوای بالینی واقعی نیست.',
            ]);
            $student->posts()->create([
                'type' => 'text',
                'is_demo' => true,
                'body' => 'اولین هفته کارآموزی بود. بیشتر از هر چیز، دیدن نحوه حرف زدن رزیدنت‌ها با هم یاد گرفتم.',
            ]);

            $rezaei->following()->syncWithoutDetaching([$karimi->id, $ahmadi->id]);
            $karimi->following()->syncWithoutDetaching([$rezaei->id]);
            $student->following()->syncWithoutDetaching([$rezaei->id, $karimi->id]);
            $nouri->following()->syncWithoutDetaching([$rezaei->id]);

            $topic = Topic::query()->create([
                'community_id' => $heart->id,
                'user_id' => $rezaei->id,
                'kind' => 'case',
                'title' => 'بررسی رویکردهای تشخیصی در بیماران با درد قفسه سینه',
                'body' => 'کیس کاملاً ساختگی: مرد میانسال با درد فشاری، بدون هیچ شناسه هویتی. هدف، تمرین گفت‌وگوی همکاران است نه تصمیم درمانی.',
                'anonymous' => true,
                'disclaimer_accepted' => true,
                'is_demo' => true,
            ]);
            $topic->replies()->create([
                'user_id' => $ahmadi->id,
                'body' => 'در این نمونه ساختگی، اول شرح‌حال و نوار را کنار هم می‌گذارم و بعد سراغ تست می‌روم. این نظر شخصی است.',
            ]);

            $poll = Topic::query()->create([
                'community_id' => $heart->id,
                'user_id' => $karimi->id,
                'kind' => 'poll',
                'title' => 'در جلسه گزارش صبحگاهی، کدام قالب برای شما خواناتر است؟',
                'body' => 'نظرسنجی نمایشی. نتیجه آن اجماع علمی یا دستورالعمل درمانی نیست.',
                'disclaimer_accepted' => true,
                'is_demo' => true,
            ]);
            $poll->options()->createMany([
                ['label' => 'شرح کوتاه و سؤال مشخص', 'position' => 0],
                ['label' => 'مرور نظام‌مند تشخیص‌های افتراقی', 'position' => 1],
                ['label' => 'تمرکز بر خطای محتمل', 'position' => 2],
            ]);

            $one = min($rezaei->id, $karimi->id);
            $two = max($rezaei->id, $karimi->id);
            $conversation = Conversation::query()->create([
                'type' => 'direct',
                'user_one_id' => $one,
                'user_two_id' => $two,
                'last_message_at' => now(),
            ]);
            $conversation->ensureDirectParticipants();
            $conversation->messages()->create([
                'sender_id' => $karimi->id,
                'body' => 'محمد جان، اسلاید جلسه پنجشنبه را در انجمن قلب می‌گذارم. کیس‌ها ساختگی‌اند.',
            ]);

            Vacancy::query()->create([
                'organization_id' => $org->id,
                'title' => 'دعوت به همکاری متخصص قلب و عروق',
                'specialty' => 'قلب و عروق',
                'city' => 'تهران',
                'employment_type' => 'full_time',
                'description' => 'آگهی کاملاً ساختگی برای نمایش جریان کاریابی. هیچ استخدامی انجام نمی‌شود و رزومه واقعی نفرستید.',
                'status' => 'published',
            ]);

            $post->hashtags()->create(['name' => 'قلب']);

            $admin->notify(new UserAlert('system', 'به طبیار خوش آمدید', 'این اعلان نمونه‌ای برای داشبورد است.', '/notifications'));
        }

        $this->seedRichDemo(
            $rezaei,
            $karimi,
            $ahmadi,
            $nouri,
            $student,
            $heart,
            $org,
            $employer,
            $admin,
        );
    }

    private function seedRichDemo(
        User $rezaei,
        User $karimi,
        User $ahmadi,
        User $nouri,
        User $student,
        Community $heart,
        Organization $org,
        User $employer,
        User $admin,
    ): void {
        $demoPosts = Post::query()->where('is_demo', true)->get();
        if ($demoPosts->count() < 10) {
            $extra = [
                [$rezaei, 'درمانگاه قلب این هفته شلوغ بود؛ جالب بود چند مورد با علائم غیرمعمول مراجعه کردند. #قلب'],
                [$karimi, 'در مورد اگزامای حاد، بیشتر از پروتکل، ارتباط با بیمار ماندگار می‌ماند. #پوست'],
                [$ahmadi, 'سندرم متابولیک در بخش داخلی دوباره محور بحث گردی بود. #داخلی'],
                [$nouri, 'اولین روز شیفت جراحی؛ یادگیری بیشتر از اتاق عمل بود. #جراحی'],
                [$student, 'امروز با رزیدنت قلب کیسِ آموزشی مرور کردیم (ساختگی).'],
                [$karimi, 'چند منبع آموزشی برای همکاران رزیدنت پوست جمع کردم؛ اگر لازم است بفرستم.'],
                [$rezaei, 'جلسه موردگی ماه آینده روی نارسایی قلبی تمرکز دارد.'],
            ];
            foreach ($extra as [$author, $body]) {
                $author->posts()->create(['type' => 'text', 'is_demo' => true, 'body' => $body]);
            }
        }

        $firstPost = Post::query()->where('is_demo', true)->oldest()->first();
        if ($firstPost && Reaction::query()->where('post_id', $firstPost->id)->doesntExist()) {
            foreach ([$karimi, $ahmadi, $student, $nouri] as $actor) {
                Reaction::query()->create(['post_id' => $firstPost->id, 'user_id' => $actor->id, 'type' => 'like']);
            }
            Comment::query()->create([
                'post_id' => $firstPost->id,
                'user_id' => $karimi->id,
                'body' => 'نکته خوبی بود؛ در تیم ما هم همین الگو دیده می‌شود.',
            ]);
            Comment::query()->create([
                'post_id' => $firstPost->id,
                'user_id' => $ahmadi->id,
                'body' => 'برای هماهنگی بین‌رشته‌ای کاملاً موافقم.',
            ]);
            Bookmark::query()->create(['post_id' => $firstPost->id, 'user_id' => $student->id]);
        }

        $original = Post::query()->where('is_demo', true)->where('type', '!=', 'repost')->skip(1)->first();
        if ($original && ! Post::query()->where('repost_of_id', $original->id)->exists()) {
            $rezaei->posts()->create([
                'type' => 'repost',
                'is_demo' => true,
                'repost_of_id' => $original->id,
                'body' => 'برای همکاران رزیدنت مفید است.',
            ]);
            $ahmadi->posts()->create([
                'type' => 'repost',
                'is_demo' => true,
                'repost_of_id' => $original->id,
                'body' => null,
            ]);
        }

        foreach ([[$rezaei, $heart], [$karimi, Community::query()->where('slug', 'dermatology')->first()], [$ahmadi, Community::query()->where('slug', 'internal')->first()], [$nouri, Community::query()->where('slug', 'surgery')->first()]] as [$member, $community]) {
            if ($community) {
                $member->communities()->syncWithoutDetaching([$community->id]);
            }
        }

        if (Story::query()->count() === 0) {
            foreach ([$rezaei, $karimi] as $author) {
                $author->stories()->create([
                    'path' => 'stories/demo-'.$author->slug.'.jpg',
                    'expires_at' => now()->addDay(),
                ]);
            }
        }

        $karimi->entries()->firstOrCreate(['kind' => 'education', 'title' => 'تخصص پوست'], [
            'subtitle' => 'دانشگاه شهید بهشتی',
            'year' => '۱۳۹۳',
        ]);

        if (Vacancy::query()->count() < 4) {
            Vacancy::query()->create([
                'organization_id' => $org->id,
                'title' => 'متخصص پوست — شیفت صبح',
                'specialty' => 'پوست',
                'city' => 'تهران',
                'employment_type' => 'part_time',
                'description' => 'آگهی نمایشی؛ فقط برای تست جریان درخواست.',
                'status' => 'published',
            ]);
            Vacancy::query()->create([
                'organization_id' => $org->id,
                'title' => 'رزیدنت جراحی — مرکز آموزشی',
                'specialty' => 'جراحی',
                'city' => 'شیراز',
                'employment_type' => 'full_time',
                'description' => 'آگهی ساختگی برای نمایش فیلتر شهر.',
                'status' => 'published',
            ]);
            Vacancy::query()->create([
                'organization_id' => $org->id,
                'title' => 'پزشک عمومی — درمانگاه شبانه‌روزی',
                'specialty' => 'پزشکی عمومی',
                'city' => 'اصفهان',
                'employment_type' => 'full_time',
                'description' => 'نمونه آگهی برای تب فرصت‌های شغلی.',
                'status' => 'published',
            ]);
        }

        $job = Vacancy::query()->where('specialty', 'قلب و عروق')->first();
        if ($job && VacancyApplication::query()->where('vacancy_id', $job->id)->doesntExist()) {
            VacancyApplication::query()->create([
                'vacancy_id' => $job->id,
                'user_id' => $rezaei->id,
                'cover_letter' => 'درخواست نمایشی برای تست رابط کارفرما.',
                'status' => 'pending',
            ]);
        }

        $one = min($rezaei->id, $ahmadi->id);
        $two = max($rezaei->id, $ahmadi->id);
        if (! Conversation::query()->where('user_one_id', $one)->where('user_two_id', $two)->where('type', 'direct')->exists()) {
            $dm = Conversation::query()->create([
                'type' => 'direct',
                'user_one_id' => $one,
                'user_two_id' => $two,
                'last_message_at' => now(),
            ]);
            $dm->ensureDirectParticipants();
            $dm->messages()->create(['sender_id' => $ahmadi->id, 'body' => 'سلام محمد جان، درباره کیس داخلی دیروز نظری داری؟']);
        }

        if (! Conversation::query()->where('type', 'group')->where('title', 'گروه رزیدنت‌های قلب')->exists()) {
            $group = Conversation::query()->create([
                'type' => 'group',
                'title' => 'گروه رزیدنت‌های قلب',
                'created_by' => $rezaei->id,
                'last_message_at' => now(),
            ]);
            foreach ([$rezaei, $karimi, $ahmadi, $nouri] as $member) {
                $group->participants()->create([
                    'user_id' => $member->id,
                    'role' => $member->id === $rezaei->id ? 'admin' : 'member',
                    'last_read_at' => $member->id === $rezaei->id ? now() : null,
                ]);
            }
            $group->messages()->create([
                'sender_id' => $rezaei->id,
                'body' => 'دوستان، فردا جلسه موردگی ساعت ۸ — کیس‌ها ساختگی هستند.',
            ]);
            $group->messages()->create([
                'sender_id' => $nouri->id,
                'body' => 'ممنون، شرکت می‌کنم.',
            ]);
        }

        $heartTag = Hashtag::query()->firstOrCreate(['name' => 'قلب']);
        $skinTag = Hashtag::query()->firstOrCreate(['name' => 'پوست']);
        Post::query()->where('is_demo', true)->where('body', 'like', '%#قلب%')->each(function (Post $post) use ($heartTag) {
            $post->hashtags()->syncWithoutDetaching([$heartTag->id]);
        });
        Post::query()->where('is_demo', true)->where('body', 'like', '%#پوست%')->each(function (Post $post) use ($skinTag) {
            $post->hashtags()->syncWithoutDetaching([$skinTag->id]);
        });

        if ($admin->unreadNotifications()->count() < 3) {
            $rezaei->notify(new UserAlert('like', 'پسند جدید', 'سارا کریمی پست شما را پسندید.', '/'));
            $karimi->notify(new UserAlert('comment', 'نظر جدید', 'علی احمدی روی پست شما نظر داد.', '/'));
            $student->notify(new UserAlert('follow', 'دنبال‌کننده', 'دکتر محمد رضایی شما را دنبال کرد.', '/doctors/mohammad-rezaei'));
        }

        if ($rezaei->subscriptions()->doesntExist()) {
            $rezaei->subscriptions()->create([
                'plan' => 'اشتراک یک‌ساله',
                'months' => 12,
                'amount' => 0,
                'status' => 'active',
                'starts_at' => now()->subDays(10),
                'ends_at' => $rezaei->pro_until,
                'handled_by' => $admin->id,
                'note' => 'اشتراک دمو طبیار پرو',
            ]);
        }

        if ($ahmadi->subscriptions()->where('status', 'pending')->doesntExist()) {
            $ahmadi->subscriptions()->create([
                'plan' => 'اشتراک یک‌ماهه',
                'months' => 1,
                'amount' => 0,
                'status' => 'pending',
                'reference' => 'DEMO-98421',
            ]);
        }

        $this->seedInsightsDemo($rezaei, [$karimi, $ahmadi, $nouri, $student]);
    }

    /** @param array<int, User> $viewers */
    private function seedInsightsDemo(User $owner, array $viewers): void
    {
        if (PostView::query()->exists()) {
            return;
        }

        $posts = $owner->posts()->visible()->where('type', '!=', 'repost')->get();
        $sources = ['feed', 'explore', 'profile', 'detail'];

        foreach (range(0, 29) as $daysAgo) {
            $day = now()->subDays($daysAgo)->toDateString();
            foreach ($viewers as $idx => $viewer) {
                if (($daysAgo + $idx) % 2 === 0) {
                    ProfileView::query()->firstOrCreate(
                        [
                            'profile_id' => $owner->id,
                            'viewer_id' => $viewer->id,
                            'viewed_on' => $day,
                        ],
                        ['views' => 1 + (($daysAgo + $idx) % 3)],
                    );
                }

                foreach ($posts as $pIdx => $post) {
                    if (($daysAgo + $idx + $pIdx) % 3 !== 0) {
                        PostView::query()->firstOrCreate(
                            [
                                'post_id' => $post->id,
                                'user_id' => $viewer->id,
                                'viewed_on' => $day,
                            ],
                            [
                                'views' => 1 + (($daysAgo + $pIdx) % 4),
                                'source' => $sources[($daysAgo + $pIdx + $idx) % count($sources)],
                            ],
                        );
                    }
                }
            }
        }
    }

    private function person(array $attributes): User
    {
        $phone = $attributes['phone'];

        return User::query()->updateOrCreate(['phone' => $phone], array_merge([
            'email' => $phone.'@members.tebyar.invalid',
            'password' => 'password',
            'account_status' => 'verified',
            'is_demo' => true,
        ], $attributes));
    }
}
