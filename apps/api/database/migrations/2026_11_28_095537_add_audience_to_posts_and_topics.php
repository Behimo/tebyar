<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->json('audience')->nullable()->after('repost_of_id');
        });

        Schema::table('topics', function (Blueprint $table) {
            $table->json('audience')->nullable()->after('kind');
        });
    }

    public function down(): void
    {
        Schema::table('topics', function (Blueprint $table) {
            $table->dropColumn('audience');
        });

        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn('audience');
        });
    }
};
