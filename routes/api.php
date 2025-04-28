<?php

use Illuminate\Support\Facades\Route;
use Arcnine\AltGeneratorAI\Http\Controllers\AltGeneratorController;

Route::group([
    'middleware' => [
        'web',
        'statamic.cp.authenticated',
    ],
], function () {
    // Get paginated assets
    Route::get('altgeneratorai/assets', [AltGeneratorController::class, 'assets'])->name('altgeneratorai.assets');

    // Generate alt text for selected assets.
    Route::post('altgeneratorai/generate', [AltGeneratorController::class, 'generate'])->name('altgeneratorai.generate');

    // Approve (save) the generated alt text.
    Route::post('altgeneratorai/approve', [AltGeneratorController::class, 'approve'])->name('altgeneratorai.approve');
});
