<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Artisan;

Route::get('/setup-storage', function () {
    try {
        Artisan::call('storage:link');
        return 'Storage link created successfully!';
    } catch (\Exception $e) {
        return 'Error: ' . $e->getMessage();
    }
});

Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '.*');
