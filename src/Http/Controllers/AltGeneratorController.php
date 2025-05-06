<?php

namespace Arcnine\AltGeneratorAI\Http\Controllers;

use Illuminate\Http\Request;
use Statamic\Http\Controllers\CP\CpController;
use Statamic\Assets\Asset;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Statamic\Facades\User;
use Statamic\Facades\Site;

class AltGeneratorController extends CpController
{

    public function index()
    {
        $is_api_key_set = env('ALT_GENERATOR_API_KEY') ? true : false;
        return view('altgeneratorai::index', [
            'is_api_key_set' => $is_api_key_set,
            'language' => Site::current()->locale()
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
            $languages = [];
            foreach (Site::all() as $site) {
                $languages[] = substr($site->locale(), 0, 2);
            }
            $asset_url = $asset->url();
            if (!str_starts_with($asset_url, 'http')) {
                $asset_url = config('app.url') . $asset_url;
            }
            $body_data = [
                'url' => $asset_url,
                'language' => $languages,
                'existingAltText' => $asset->get('alt', ''),
                'assetId' => $asset->id(),
            ];
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'x-access-token' => $access_token,
            ])->timeout(120)->post('https://api.alt-generator.ai/generate', $body_data);
            $generatedAlt = $response->successful()
                ? $response->json()['alt']
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
        $languages = [];
        foreach (Site::all() as $site) {
            $languages[] = substr($site->locale(), 0, 2);
        }

        foreach ($approvals as $assetId => $newAlt) {
            $asset = Asset::find($assetId);
            if (!$asset) {
                continue;
            }
            foreach ($languages as $index => $language) {
                if ($languages[0] === $language) {
                    $asset->set('alt', $newAlt[$index]);
                } else {
                    $asset->set('alt_' . $language, $newAlt[$index]);
                }
                $asset->save();
            }
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
