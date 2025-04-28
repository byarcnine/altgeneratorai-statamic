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
@if ($is_api_key_set)
<aialtgen />
<script>
    window.csrf_token = "{{ csrf_token() }}";
</script>
@else
<div class="flex flex-col h-screen">
    <h1 class="text-2xl font-bold mb-4">Alt Generator AI</h1>
    <p class="text-gray-800 mb-4 bg-gray-100 px-2 py-1 rounded-md">Please set the API key in the environment variables to use the Alt Generator AI.<br /><span class="text-red-500">ALT_GENERATOR_API_KEY</span></p>
    <p class="text-gray-800 bg-gray-100 px-2 py-1 rounded-md">
        If you don't have an API key yet, you can get one from <a class="underline text-blue-500" href="https://alt-generator.ai" target="_blank">alt-generator.ai</a>.
    </p>
</div>
@endif
@endsection