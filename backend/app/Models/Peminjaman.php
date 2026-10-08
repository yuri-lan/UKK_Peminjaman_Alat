<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Peminjaman extends Model
{
    protected $table = 'peminjaman';
    protected $primaryKey = 'id_pinjam';
    public $timestamps = false;

    protected $fillable = [
        'kode_pinjam', 'id_user', 'id_alat', 'tgl_pinjam',
        'tgl_rencana_kembali', 'tgl_kembali_aktual', 'jumlah',
        'status', 'id_petugas', 'catatan'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'id_user');
    }

    public function alat()
    {
        return $this->belongsTo(Alat::class, 'id_alat');
    }

    public function pengembalian()
{
    return $this->hasOne(Pengembalian::class, 'id_pinjam', 'id_pinjam');
}
}