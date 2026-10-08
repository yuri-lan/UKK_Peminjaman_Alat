<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Kategori extends Model
{
    protected $table = 'kategori';
    protected $primaryKey = 'id_kategori';
    public $timestamps = false;

    protected $fillable = ['nama_kategori', 'deskripsi'];

    public function alat()
    {
        return $this->hasMany(Alat::class, 'id_kategori');
    }
}