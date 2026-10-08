<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pengembalian extends Model
{
    protected $table = 'pengembalian';
    protected $primaryKey = 'id_kembali';
    public $timestamps = false;

    protected $fillable = [
        'id_pinjam', 'tgl_kembali', 'kondisi_saat_kembali',
        'denda', 'denda_lunas', 'tgl_lunas', 'id_petugas_lunas',
        'keterangan'
    ];

    public function peminjaman()
    {
        return $this->belongsTo(Peminjaman::class, 'id_pinjam');
    }

    public function petugasLunas()
    {
        return $this->belongsTo(User::class, 'id_petugas_lunas');
    }
}