<?php

namespace App\Filament\Resources\CommunityResource\Pages;

use App\Filament\Resources\CommunityResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListCommunities extends ListRecords
{
    protected static string $resource = CommunityResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make()->label('انجمن جدید'),
        ];
    }
}
