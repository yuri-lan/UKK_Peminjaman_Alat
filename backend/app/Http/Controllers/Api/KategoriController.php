<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Kategori;
use Illuminate\Http\Request;

class KategoriController extends Controller
{
    public function index()
    {
        return response()->json(['success'=>true,'data'=>Kategori::orderBy('id_kategori')->get()]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'nama_kategori' => 'required|string|max:50|unique:kategori,nama_kategori',
            'deskripsi'     => 'nullable|string',
        ]);
        $k = Kategori::create($data);
        return response()->json(['success'=>true,'message'=>'Kategori dibuat','data'=>$k], 201);
    }

    public function update(Request $request, $id)
    {
        $k = Kategori::find($id);
        if (!$k) return response()->json(['success'=>false,'message'=>'Tidak ditemukan'],404);

        $data = $request->validate([
            'nama_kategori' => 'sometimes|string|max:50',
            'deskripsi'     => 'nullable|string',
        ]);
        $k->update($data);
        return response()->json(['success'=>true,'message'=>'Kategori diupdate','data'=>$k]);
    }

    public function destroy($id)
    {
        $k = Kategori::find($id);
        if (!$k) return response()->json(['success'=>false,'message'=>'Tidak ditemukan'],404);
        try {
            $k->delete();
        } catch (\Throwable $e) {
            return response()->json(['success'=>false,'message'=>'Tidak bisa dihapus: masih dipakai alat'],400);
        }
        return response()->json(['success'=>true,'message'=>'Kategori dihapus']);
    }
}