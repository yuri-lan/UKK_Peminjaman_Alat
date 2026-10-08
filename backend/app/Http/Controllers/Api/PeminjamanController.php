<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Peminjaman;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PeminjamanController extends Controller
{
   public function index(Request $request)
{
    // 🔥 PAKAI INI, JANGAN $request->user()
    $user = auth('sanctum')->user();

    if (!$user) {
        return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
    }

    $query = Peminjaman::with([
        'user:id_user,nama_lengkap,username',
        'alat:id_alat,nama_alat,kode_alat',
        'pengembalian',
    ]);

    // Peminjam cuma lihat miliknya sendiri
    if ($user->role === 'peminjam') {
        $query->where('id_user', $user->id_user);
    }

    // ... filter sama kayak sebelumnya ...
    if ($request->filled('q')) {
        $q = $request->q;
        $query->where(function ($sq) use ($q) {
            $sq->where('kode_pinjam', 'like', "%$q%")
               ->orWhereHas('user', fn($u) => $u->where('nama_lengkap', 'like', "%$q%"))
               ->orWhereHas('alat', fn($a) => $a->where('nama_alat', 'like', "%$q%")
                                                ->orWhere('kode_alat', 'like', "%$q%"));
        });
    }

    if ($request->filled('status'))  $query->where('status', $request->status);
    if ($request->filled('id_alat')) $query->where('id_alat', $request->id_alat);
    if ($request->filled('id_user')) $query->where('id_user', $request->id_user);

    if ($request->filled('tgl_pinjam_dari'))
        $query->whereDate('tgl_pinjam', '>=', $request->tgl_pinjam_dari);
    if ($request->filled('tgl_pinjam_sampai'))
        $query->whereDate('tgl_pinjam', '<=', $request->tgl_pinjam_sampai);
    if ($request->filled('tgl_kembali_dari'))
        $query->whereDate('tgl_rencana_kembali', '>=', $request->tgl_kembali_dari);
    if ($request->filled('tgl_kembali_sampai'))
        $query->whereDate('tgl_rencana_kembali', '<=', $request->tgl_kembali_sampai);

    // Pagination
    $perPage = (int) $request->input('per_page', 10);
    if ($perPage < 1) $perPage = 10;
    if ($perPage > 9999) $perPage = 9999;

    $data = $query->orderBy('id_pinjam', 'desc')->paginate($perPage);

    return response()->json([
        'success' => true,
        'data' => $data->items(),
        'pagination' => [
            'current_page' => $data->currentPage(),
            'last_page'    => $data->lastPage(),
            'per_page'     => $data->perPage(),
            'total'        => $data->total(),
            'from'         => $data->firstItem() ?? 0,
            'to'           => $data->lastItem() ?? 0,
        ],
    ]);
}

    public function store(Request $request)
    {
        $data = $request->validate([
            'id_alat'             => 'required|integer|exists:alat,id_alat',
            'tgl_pinjam'          => 'required|date',
            'tgl_rencana_kembali' => 'required|date|after_or_equal:tgl_pinjam',
            'jumlah'              => 'required|integer|min:1',
        ]);

        try {
            DB::select(
                'CALL sp_ajukan_peminjaman(?, ?, ?, ?, ?, @id, @msg)',
                [
                    $request->user()->id_user,
                    $data['id_alat'],
                    $data['tgl_pinjam'],
                    $data['tgl_rencana_kembali'],
                    $data['jumlah'],
                ]
            );

            $out = DB::select('SELECT @id AS id_pinjam, @msg AS pesan');
            $id = $out[0]->id_pinjam ?? null;
            $pesan = $out[0]->pesan ?? '';

            if (!$id) {
                return response()->json(['success' => false, 'message' => $pesan], 400);
            }

            return response()->json([
                'success' => true,
                'message' => $pesan,
                'data' => ['id_pinjam' => $id]
            ], 201);

        } catch (\Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Gagal: ' . $e->getMessage()], 500);
        }
    }

    public function approve(Request $request, $id)
    {
        $request->validate(['status' => 'required|in:disetujui,ditolak']);

        $p = Peminjaman::find($id);
        if (!$p) {
            return response()->json(['success' => false, 'message' => 'Data tidak ditemukan'], 404);
        }

        $p->update([
            'status' => $request->status,
            'id_petugas' => $request->user()->id_user,
        ]);

        return response()->json(['success' => true, 'message' => 'Status diupdate', 'data' => $p]);
    }
    // 🆕 Ambil daftar peminjam yang PUNYA data di tabel peminjaman
public function peminjamList()
{
    $data = Peminjaman::with('user:id_user,nama_lengkap,username')
        ->select('id_user')
        ->distinct()
        ->get()
        ->pluck('user')
        ->filter()
        ->unique('id_user')
        ->values();

    return response()->json(['success' => true, 'data' => $data]);
}

// 🆕 Ambil daftar alat yang PUNYA data di tabel peminjaman
public function alatList()
{
    $data = Peminjaman::with('alat:id_alat,nama_alat,kode_alat')
        ->select('id_alat')
        ->distinct()
        ->get()
        ->pluck('alat')
        ->filter()
        ->unique('id_alat')
        ->values();

    return response()->json(['success' => true, 'data' => $data]);
}
}