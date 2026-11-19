<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->string('type')->default('direct')->after('id');
            $table->string('title')->nullable()->after('type');
            $table->foreignId('created_by')->nullable()->after('title')->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('user_one_id')->nullable()->change();
            $table->unsignedBigInteger('user_two_id')->nullable()->change();
        });

        Schema::create('conversation_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role')->default('member');
            $table->timestamp('last_read_at')->nullable();
            $table->timestamps();
            $table->unique(['conversation_id', 'user_id']);
        });

        DB::table('conversations')->whereNull('type')->update(['type' => 'direct']);

        foreach (DB::table('conversations')->where('type', 'direct')->orderBy('id')->get() as $row) {
            $readOne = $row->user_one_read_at;
            $readTwo = $row->user_two_read_at;
            $now = now();
            foreach ([$row->user_one_id, $row->user_two_id] as $index => $userId) {
                if (! $userId) {
                    continue;
                }
                $readAt = $index === 0 ? $readOne : $readTwo;
                DB::table('conversation_participants')->updateOrInsert(
                    ['conversation_id' => $row->id, 'user_id' => $userId],
                    [
                        'role' => 'member',
                        'last_read_at' => $readAt,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ]
                );
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('conversation_participants');

        Schema::table('conversations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by');
            $table->dropColumn(['type', 'title']);
            $table->unsignedBigInteger('user_one_id')->nullable(false)->change();
            $table->unsignedBigInteger('user_two_id')->nullable(false)->change();
        });
    }
};