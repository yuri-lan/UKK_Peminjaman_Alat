<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AlatController;
use App\Http\Controllers\Api\KategoriController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\LogAktivitasController;
use App\Http\Controllers\Api\PeminjamanController;
use App\Http\Controllers\Api\PengembalianController;
use Illuminate\Support\Facades\Route;

// ================= PUBLIC =================
Route::post('/login', [AuthController::class, 'login']);

// ================= PROTECTED =================
Route::middleware('auth:sanctum')->group(function () {

    // ---------- Auth ----------
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // ---------- Alat (semua role bisa lihat) ----------
    Route::get('/alat', [AlatController::class, 'index']);
    Route::get('/alat/{id}', [AlatController::class, 'show']);

    // ---------- Kategori (semua role bisa lihat) ----------
    Route::get('/kategori', [KategoriController::class, 'index']);

    // ---------- ADMIN ONLY ----------
    Route::middleware('role:admin')->group(function () {
        // Alat CRUD
        Route::post('/alat', [AlatController::class, 'store']);
        Route::put('/alat/{id}', [AlatController::class, 'update']);
        Route::delete('/alat/{id}', [AlatController::class, 'destroy']);

        // Kategori CRUD
        Route::post('/kategori', [KategoriController::class, 'store']);
        Route::put('/kategori/{id}', [KategoriController::class, 'update']);
        Route::delete('/kategori/{id}', [KategoriController::class, 'destroy']);

        // User CRUD
        Route::get('/user', [UserController::class, 'index']);
        Route::post('/user', [UserController::class, 'store']);
        Route::put('/user/{id}', [UserController::class, 'update']);
        Route::delete('/user/{id}', [UserController::class, 'destroy']);

        // Log
        Route::get('/log-aktivitas', [LogAktivitasController::class, 'index']);
    });

    // ---------- PEMINJAMAN ----------
    // ⚠️ URUTAN PENTING: route spesifik DULU sebelum yang generic
    Route::get('/peminjaman/peminjam-list', [PeminjamanController::class, 'peminjamList'])
        ->middleware('role:petugas,admin');
    Route::get('/peminjaman/alat-list', [PeminjamanController::class, 'alatList'])
        ->middleware('role:petugas,admin');

    // 🔥 INI YANG HILANG — WAJIB ADA
    Route::get('/peminjaman', [PeminjamanController::class, 'index']);
    Route::post('/peminjaman', [PeminjamanController::class, 'store']);

    Route::put('/peminjaman/{id}/approve', [PeminjamanController::class, 'approve'])
        ->middleware('role:petugas,admin');

    // ---------- PENGEMBALIAN ----------
    Route::post('/pengembalian', [PengembalianController::class, 'store'])
        ->middleware('role:petugas,admin');
    Route::post('/pengembalian/hitung-denda', [PengembalianController::class, 'hitungDenda']);

    // ---------- DENDA (Kelola Denda) ----------
    Route::get('/denda', [PengembalianController::class, 'indexDenda'])
        ->middleware('role:petugas,admin');
    Route::put('/denda/{id}/lunas', [PengembalianController::class, 'tandaiLunas'])
        ->middleware('role:petugas,admin');
});