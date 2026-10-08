<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\LogAktivitas;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $limit = $request->input('limit', 50);
        $users = User::select('id_user','username','nama_lengkap','role','no_telp','is_active','created_at')
            ->orderBy('id_user','desc')->limit($limit)->get();
        return response()->json(['success'=>true,'data'=>$users]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'username'     => 'required|string|max:50|unique:user,username',
            'password'     => 'required|string|min:5',
            'nama_lengkap' => 'required|string|max:100',
            'role'         => 'required|in:admin,petugas,peminjam',
            'no_telp'      => 'nullable|string|max:15',
        ]);
        $data['password'] = md5($data['password']);
        $data['is_active'] = 1;
        $user = User::create($data);

        LogAktivitas::create([
            'id_user'       => $request->user()->id_user,
            'aksi'          => 'TAMBAH_USER',
            'tabel_terkait' => 'user',
            'deskripsi'     => 'Menambah user: '.$user->username,
        ]);

        return response()->json(['success'=>true,'message'=>'User dibuat','data'=>$user], 201);
    }

    public function update(Request $request, $id)
    {
        $user = User::find($id);
        if (!$user) return response()->json(['success'=>false,'message'=>'User tidak ditemukan'],404);

        $data = $request->validate([
            'nama_lengkap' => 'sometimes|string|max:100',
            'role'         => 'sometimes|in:admin,petugas,peminjam',
            'no_telp'      => 'nullable|string|max:15',
            'is_active'    => 'sometimes|in:0,1',
        ]);
        if ($request->filled('password')) $data['password'] = md5($request->password);

        $user->update($data);
        return response()->json(['success'=>true,'message'=>'User diupdate','data'=>$user]);
    }

    public function destroy(Request $request, $id)
    {
        if ($request->user()->id_user == $id) {
            return response()->json(['success'=>false,'message'=>'Tidak bisa hapus akun sendiri'],400);
        }
        $user = User::find($id);
        if (!$user) return response()->json(['success'=>false,'message'=>'User tidak ditemukan'],404);
        $user->delete();
        return response()->json(['success'=>true,'message'=>'User dihapus']);
    }
}