<?php

namespace Arcnine\AltGeneratorAI\Http\Controllers;

use Illuminate\Http\Request;
use Statamic\Http\Controllers\CP\CpController;
use Statamic\Assets\Asset;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Statamic\Facades\User;

class AltGeneratorController extends CpController
{

    public function index()
    {
        $is_api_key_set = env('ALT_GENERATOR_API_KEY') ? true : false;
        return view('altgeneratorai::index', [
            'is_api_key_set' => $is_api_key_set,
        ]);
    }

    public function generate(Request $request)
    {
        $assetIds = $request->input('asset_ids', []);
        $generatedTexts = [];

        foreach ($assetIds as $assetId) {
            $asset = Asset::find($assetId);
            if (!$asset) {
                continue;
            }

            $access_token = env('ALT_GENERATOR_API_KEY');
            if (!$access_token) {
                return response()->json([
                    'error' => 'API key not found. Please check your environment variables.',
                ], 500);
            }
            $body_data = [
                'url' => $asset->url(),
                'language' => [config('app.locale', 'en')],
                'existingAltText' => $asset->get('alt', ''),
                'assetId' => $asset->id(),
            ];
            Log::info($body_data);
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'x-access-token' => $access_token,
            ])->timeout(120)->post('https://api.alt-generator.ai/generate', $body_data);
            Log::info($response->json());
            $generatedAlt = $response->successful()
                ? $response->json()['alt'][0]
                : "Failed to generate alt text for " . $asset->filename();

            $generatedTexts[$assetId] = $generatedAlt;
        }
        return response()->json([
            'generated' => $generatedTexts,
        ]);
    }

    /**
     * Approve the generated alt text and update the asset metadata.
     */
    public function approve(Request $request)
    {
        $approvals = $request->input('approvals', []); // Expect an array: assetId => newAlt text

        foreach ($approvals as $assetId => $newAlt) {
            $asset = Asset::find($assetId);
            if (!$asset) {
                continue;
            }
            // Update the asset meta; assumes the alt text is stored under 'alt'
            $asset->set('alt', $newAlt);
            $asset->save();
        }
        return response()->json([
            'status' => 'success',
            'message' => 'Alt text approved for selected assets.',
        ]);
    }

    public function assets(Request $request)
    {
        $user = User::current();
        abort_unless($user, 403, 'Unauthorized');
        // Get all asset containers
        $containers = \Statamic\Facades\AssetContainer::all();
        $assets = collect();

        // Get assets from each container
        foreach ($containers as $container) {
            $containerAssets = $container->queryAssets()->where('is_image', true)->get();
            $assets = $assets->concat($containerAssets);
        }

        // Paginate the combined collection
        $perPage = 25;
        $currentPage = $request->get('page', 1);
        $paginatedAssets = $assets->forPage($currentPage, $perPage);
        $assets = new \Illuminate\Pagination\LengthAwarePaginator(
            $paginatedAssets,
            $assets->count(),
            $perPage,
            $currentPage,
            ['path' => $request->url()]
        );

        $data = [];
        foreach ($assets as $asset) {
            $currentAlt = $asset->get('alt') ?? '';
            $data[] = [
                'id' => $asset->id(),
                'filename' => $asset->filename(),
                'url' => $asset->url(),
                'current_alt' => $currentAlt,
                'generated_alt' => '',
                'preview_url' => $asset->thumbnailUrl('small'),
                'is_approved' => false,
            ];
        }

        return response()->json([
            'data' => $data,
            'current_page' => $assets->currentPage(),
            'last_page' => $assets->lastPage(),
            'per_page' => $perPage,
            'total' => $assets->total(),
        ]);
    }
}
