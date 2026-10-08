<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alat;
use Illuminate\Http\Request;

class AlatController extends Controller
{
    public function index(Request $request)
    {
        $limit = $request->input('limit', 20);

        $alat = Alat::with('kategori:id_kategori,nama_kategori')
            ->select('id_alat','kode_alat','nama_alat','id_kategori','stok_total','stok_tersedia','kondisi')
            ->orderBy('id_alat', 'desc')
            ->limit($limit)
            ->get();

        return response()->json(['success' => true, 'data' => $alat]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'kode_alat' => 'required|string|max:20|unique:alat,kode_alat',
            'nama_alat' => 'required|string|max:100',
            'id_kategori' => 'required|integer|exists:kategori,id_kategori',
            'stok_total' => 'required|integer|min:0',
            'kondisi' => 'in:Baik,Rusak Ringan,Rusak Berat',
        ]);

        $data['stok_tersedia'] = $data['stok_total'];
        $alat = Alat::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Alat berhasil ditambahkan',
            'data' => $alat
        ], 201);
    }

    public function show($id)
    {
        $alat = Alat::with('kategori')->find($id);

        if (!$alat) {
            return response()->json(['success' => false, 'message' => 'Alat tidak ditemukan'], 404);
        }

        return response()->json(['success' => true, 'data' => $alat]);
    }

    public function update(Request $request, $id)
    {
        $alat = Alat::find($id);
        if (!$alat) {
            return response()->json(['success' => false, 'message' => 'Alat tidak ditemukan'], 404);
        }

        $data = $request->validate([
            'nama_alat' => 'sometimes|string|max:100',
            'id_kategori' => 'sometimes|integer|exists:kategori,id_kategori',
            'stok_total' => 'sometimes|integer|min:0',
            'kondisi' => 'sometimes|in:Baik,Rusak Ringan,Rusak Berat',
        ]);

        $alat->update($data);
        return response()->json(['success' => true, 'message' => 'Alat diupdate', 'data' => $alat]);
    }

    public function destroy($id)
    {
        $alat = Alat::find($id);
        if (!$alat) {
            return response()->json(['success' => false, 'message' => 'Alat tidak ditemukan'], 404);
        }

        $alat->delete();
        return response()->json(['success' => true, 'message' => 'Alat dihapus']);
    }
}