<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('post_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->date('viewed_on');
            $table->unsignedInteger('views')->default(1);
            $table->string('source', 20)->default('feed');
            $table->timestamps();
            $table->unique(['post_id', 'user_id', 'viewed_on']);
            $table->index(['post_id', 'viewed_on']);
        });

        Schema::create('profile_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('profile_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('viewer_id')->constrained('users')->cascadeOnDelete();
            $table->date('viewed_on');
            $table->unsignedInteger('views')->default(1);
            $table->timestamps();
            $table->unique(['profile_id', 'viewer_id', 'viewed_on']);
            $table->index(['profile_id', 'viewed_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profile_views');
        Schema::dropIfExists('post_views');
    }
};
