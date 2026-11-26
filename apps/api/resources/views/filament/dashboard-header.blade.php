@php
    use App\Filament\Access;
    use App\Filament\Labels;
    use App\Filament\Resources\ReportResource;
    use App\Filament\Resources\SupportTicketResource;
    use App\Filament\Resources\VerificationRequestResource;
    use App\Models\Report;
    use App\Models\SupportTicket;
    use App\Models\VerificationRequest;

    $user = auth()->user();
    $pendingVerifications = Access::allows(['admin', 'support'])
        ? VerificationRequest::query()->where('status', 'pending')->count()
        : 0;
    $openReports = Access::allows(['admin', 'moderator'])
        ? Report::query()->where('status', 'open')->count()
        : 0;
    $openTickets = Access::allows(['admin', 'support'])
        ? SupportTicket::query()->where('status', 'open')->count()
        : 0;
@endphp

<div class="tebyar-dash-hero">
    <div>
        <h1 class="tebyar-dash-hero-title">سلام {{ $user?->name ?? 'همکار گرامی' }}</h1>
        <p class="tebyar-dash-hero-sub">
            نقش شما: {{ Labels::staffRole($user?->staff_role) }} · نمای کلی سلامت و فعالیت شبکه تخصصی طبیار
        </p>
    </div>

    <div class="tebyar-dash-hero-meta">
        @if (Access::allows(['admin', 'support']) && $pendingVerifications > 0)
            <a href="{{ VerificationRequestResource::getUrl() }}" class="tebyar-dash-pill">
                <span>{{ $pendingVerifications }} درخواست احراز منتظر</span>
            </a>
        @endif

        @if (Access::allows(['admin', 'moderator']) && $openReports > 0)
            <a href="{{ ReportResource::getUrl() }}" class="tebyar-dash-pill">
                <span>{{ $openReports }} گزارش باز</span>
            </a>
        @endif

        @if (Access::allows(['admin', 'support']) && $openTickets > 0)
            <a href="{{ SupportTicketResource::getUrl() }}" class="tebyar-dash-pill">
                <span>{{ $openTickets }} تیکت باز</span>
            </a>
        @endif
    </div>
</div>
