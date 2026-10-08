<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;          // ← WAJIB

class User extends Authenticatable
{
    use HasApiTokens;                       // ← WAJIB

    protected $table = 'user';
    protected $primaryKey = 'id_user';
    public $timestamps = false;

    protected $fillable = [
        'username', 'password', 'nama_lengkap',
        'role', 'no_telp', 'is_active'
    ];

    protected $hidden = ['password'];
}