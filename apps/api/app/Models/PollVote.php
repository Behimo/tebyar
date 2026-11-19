<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PollVote extends Model
{
    protected $fillable = ['topic_id', 'poll_option_id', 'user_id'];
}
