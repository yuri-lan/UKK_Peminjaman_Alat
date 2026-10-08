<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LogAktivitas extends Model
{
    protected $table = 'log_aktivitas';
    protected $primaryKey = 'id_log';
    public $timestamps = false;

    protected $fillable = [
        'id_user', 'aksi', 'tabel_terkait', 'deskripsi'
    ];
    public function user()
{
    return $this->belongsTo(User::class, 'id_user');
}
}
