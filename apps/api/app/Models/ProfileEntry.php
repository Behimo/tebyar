<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProfileEntry extends Model
{
    protected $fillable = ['user_id', 'kind', 'title', 'subtitle', 'body', 'year'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
