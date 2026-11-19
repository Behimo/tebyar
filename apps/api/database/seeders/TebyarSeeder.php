<?php

namespace Database\Seeders;

use App\Models\Community;
use App\Models\Conversation;
use App\Models\Organization;
use App\Models\Post;
use App\Models\Topic;
use App\Models\User;
use App\Models\Vacancy;
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
                'user_one_id' => $one,
                'user_two_id' => $two,
                'last_message_at' => now(),
            ]);
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

            $admin->notify(new \App\Notifications\UserAlert('system', 'به طبیار خوش آمدید', 'این اعلان نمونه‌ای برای داشبورد است.', '/notifications'));
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
