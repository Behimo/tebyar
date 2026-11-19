<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserIdentity extends Model
{
    protected $fillable = [
        'user_id', 'national_id', 'medical_council_number', 'university', 'student_number', 'document_path',
    ];

    protected function casts(): array
    {
        return [
            'national_id' => 'encrypted',
            'medical_council_number' => 'encrypted',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
