<?php

namespace Arcnine\AltGeneratorAI;

use Statamic\Facades\CP\Nav;
use Statamic\Providers\AddonServiceProvider;

class ServiceProvider extends AddonServiceProvider
{
    public function boot()
    {
        parent::boot();

        Nav::extend(function ($nav) {
            $nav->content('Alt Generator AI')
                ->section('Tools')
                ->route('altgeneratorai.index')
                ->icon('image');
        });

        $this->loadRoutesFrom(__DIR__ . '/../routes/cp.php');
        $this->loadRoutesFrom(__DIR__ . '/../routes/api.php');
        $this->loadViewsFrom(__DIR__ . '/../resources/views', 'altgeneratorai');
    }

    // public function register()
    // {
    //     $this->app->bind('altgeneratorai', function () {
    //         return new AltGeneratorAI;
    //     });
    // }
}
