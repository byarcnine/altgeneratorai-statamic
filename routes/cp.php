<?php

use Illuminate\Support\Facades\Route;
use Arcnine\AltGeneratorAI\Http\Controllers\AltGeneratorController;

Route::group(['middleware' => ['statamic.cp.authenticated']], function () {
    // Display the CP interface.
    Route::get('altgeneratorai', [AltGeneratorController::class, 'index'])->name('altgeneratorai.index');
});
