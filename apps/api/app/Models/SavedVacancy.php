<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SavedVacancy extends Model
{
    protected $fillable = ['user_id', 'vacancy_id'];
}
