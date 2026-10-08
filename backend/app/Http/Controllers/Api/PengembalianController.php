<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Pengembalian;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PengembalianController extends Controller
{
    // Proses pengembalian (existing)
    public function store(Request $request)
    {
        $data = $request->validate([
            'id_pinjam' => 'required|integer|exists:peminjaman,id_pinjam',
            'tgl_kembali' => 'required|date',
            'kondisi_saat_kembali' => 'required|in:Baik,Rusak Ringan,Rusak Berat',
        ]);

        try {
            DB::select(
                'CALL sp_kembalikan_alat(?, ?, ?, ?, @denda, @msg)',
                [
                    $data['id_pinjam'],
                    $data['tgl_kembali'],
                    $data['kondisi_saat_kembali'],
                    $request->user()->id_user,
                ]
            );

            $out = DB::select('SELECT @denda AS denda, @msg AS pesan');

            return response()->json([
                'success' => true,
                'message' => $out[0]->pesan,
                'data' => ['denda' => $out[0]->denda]
            ]);

        } catch (\Throwable $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal: ' . $e->getMessage()
            ], 500);
        }
    }

    // Hitung denda manual
    public function hitungDenda(Request $request)
    {
        $request->validate([
            'tgl_rencana' => 'required|date',
            'tgl_aktual' => 'required|date',
        ]);

        $res = DB::select(
            'SELECT fn_hitung_denda(?, ?) AS denda',
            [$request->tgl_rencana, $request->tgl_aktual]
        );

        return response()->json(['success' => true, 'data' => ['denda' => $res[0]->denda]]);
    }

    // 🆕 LIST DENDA untuk halaman petugas
    public function indexDenda(Request $request)
    {
        $status = $request->input('status', 'semua'); // semua | belum | lunas

        $query = Pengembalian::with([
            'peminjaman.user:id_user,nama_lengkap,username',
            'peminjaman.alat:id_alat,nama_alat,kode_alat',
            'petugasLunas:id_user,nama_lengkap',
        ])->where('denda', '>', 0);

        if ($status === 'belum') {
            $query->where('denda_lunas', 0);
        } elseif ($status === 'lunas') {
            $query->where('denda_lunas', 1);
        }

        $data = $query->orderBy('denda_lunas', 'asc')
            ->orderBy('id_kembali', 'desc')
            ->limit(100)
            ->get();

        // Statistik
        $totalBelumLunas = Pengembalian::where('denda', '>', 0)
            ->where('denda_lunas', 0)
            ->sum('denda');

        $jumlahBelumLunas = Pengembalian::where('denda', '>', 0)
            ->where('denda_lunas', 0)
            ->count();

        return response()->json([
            'success' => true,
            'data' => $data,
            'statistik' => [
                'total_belum_lunas' => $totalBelumLunas,
                'jumlah_belum_lunas' => $jumlahBelumLunas,
            ]
        ]);
    }

    // 🆕 TANDAI LUNAS
    public function tandaiLunas(Request $request, $id)
    {
        $p = Pengembalian::find($id);
        if (!$p) {
            return response()->json(['success' => false, 'message' => 'Data tidak ditemukan'], 404);
        }

        if ($p->denda_lunas) {
            return response()->json(['success' => false, 'message' => 'Denda sudah lunas sebelumnya'], 400);
        }

        $p->update([
            'denda_lunas' => 1,
            'tgl_lunas' => now(),
            'id_petugas_lunas' => $request->user()->id_user,
        ]);

        // Log aktivitas
        DB::table('log_aktivitas')->insert([
            'id_user' => $request->user()->id_user,
            'aksi' => 'DENDA_LUNAS',
            'tabel_terkait' => 'pengembalian',
            'deskripsi' => 'Denda Rp' . number_format($p->denda, 0, ',', '.') . ' ditandai LUNAS',
            'waktu' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Denda berhasil ditandai lunas ✅',
            'data' => $p
        ]);
    }
}