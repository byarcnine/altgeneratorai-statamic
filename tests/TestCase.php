<?php

namespace Arcnine\Altgeneratorai\Tests;

use Arcnine\Altgeneratorai\ServiceProvider;
use Statamic\Testing\AddonTestCase;

abstract class TestCase extends AddonTestCase
{
    protected string $addonServiceProvider = ServiceProvider::class;
}
