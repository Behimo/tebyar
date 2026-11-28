<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Filament\Models\Contracts\FilamentUser;
use Filament\Panel;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

#[Fillable([
    'name', 'email', 'password', 'phone', 'role', 'account_status', 'staff_role',
    'slug', 'specialty_title', 'headline', 'bio', 'city', 'avatar_path',
    'education_verified_at', 'identity_verified_at', 'license_verified_at', 'specialty_verified_at',
    'pro_until', 'privacy_dm', 'privacy_mentions', 'show_read_receipts', 'open_to_work',
    'notify_interactions', 'notify_messages', 'is_demo',
])]
#[Hidden(['password', 'remember_token', 'phone'])]
class User extends Authenticatable implements FilamentUser
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'education_verified_at' => 'datetime',
            'identity_verified_at' => 'datetime',
            'license_verified_at' => 'datetime',
            'specialty_verified_at' => 'datetime',
            'pro_until' => 'datetime',
            'notify_interactions' => 'boolean',
            'notify_messages' => 'boolean',
            'show_read_receipts' => 'boolean',
            'open_to_work' => 'boolean',
            'is_demo' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (User $user): void {
            if (! $user->slug) {
                $user->slug = 'u'.Str::lower(Str::random(10));
            }

            if (! $user->email) {
                $user->email = ($user->phone ?: Str::lower(Str::random(8))).'@members.tebyar.invalid';
            }

            if (! $user->password) {
                $user->password = Str::random(40);
            }

            if (! $user->account_status) {
                $user->account_status = 'pending_review';
            }

            if (! $user->name) {
                $user->name = 'عضو طبیار';
            }
        });
    }

    public function identity(): HasOne
    {
        return $this->hasOne(UserIdentity::class);
    }

    public function verificationRequests(): HasMany
    {
        return $this->hasMany(VerificationRequest::class);
    }

    public function posts(): HasMany
    {
        return $this->hasMany(Post::class);
    }

    public function entries(): HasMany
    {
        return $this->hasMany(ProfileEntry::class);
    }

    public function stories(): HasMany
    {
        return $this->hasMany(Story::class);
    }

    public function followers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'follows', 'following_id', 'follower_id')->withTimestamps();
    }

    public function following(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'follows', 'follower_id', 'following_id')->withTimestamps();
    }

    public function communities(): BelongsToMany
    {
        return $this->belongsToMany(Community::class, 'community_members')->withTimestamps();
    }

    public function topics(): HasMany
    {
        return $this->hasMany(Topic::class);
    }

    public function organization(): HasOne
    {
        return $this->hasOne(Organization::class, 'owner_id');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function isPro(): bool
    {
        return $this->pro_until !== null && $this->pro_until->isFuture();
    }

    public function canAccessPanel(Panel $panel): bool
    {
        return in_array($this->staff_role, ['support', 'moderator', 'admin'], true);
    }

    public function roleLabel(): string
    {
        return match ($this->role) {
            'student' => 'دانشجو',
            'intern' => 'اینترن',
            'resident' => 'دستیار تخصصی',
            'general' => 'پزشک عمومی',
            'specialist' => 'پزشک متخصص',
            'pharmacist' => 'داروساز',
            'nurse' => 'پرستار',
            'veterinarian' => 'دامپزشک',
            'public' => 'عموم مردم',
            'employer' => 'کارفرما',
            default => 'عضو',
        };
    }

    public function statusLabel(): string
    {
        return match ($this->account_status) {
            'pending_review' => 'در انتظار بررسی',
            'verified' => 'تأییدشده',
            'needs_correction' => 'نیازمند اصلاح اطلاعات',
            'suspended' => 'تعلیق‌شده',
            'revoked' => 'لغوشده',
            default => $this->account_status,
        };
    }
}
