<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Alat extends Model
{
    protected $table = 'alat';
    protected $primaryKey = 'id_alat';
    public $timestamps = false;

    protected $fillable = [
        'kode_alat', 'nama_alat', 'id_kategori',
        'stok_total', 'stok_tersedia', 'kondisi'
    ];

    public function kategori()
    {
        return $this->belongsTo(Kategori::class, 'id_kategori');
    }
}