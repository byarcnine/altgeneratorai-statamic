@extends('statamic::layout')
@section('title', 'Alt Generator AI')

@push('head')
<style>
    .skeleton-pulse {
        animation: pulse 1s ease-in-out infinite;
    }

    @keyframes pulse {
        0% {
            opacity: 0.9;
        }

        50% {
            opacity: 0.5;
        }

        100% {
            opacity: 0.9;
        }
    }
</style>
@endpush

@section('content')
<aialtgen />
@endsection

@push('scripts')
@endpush