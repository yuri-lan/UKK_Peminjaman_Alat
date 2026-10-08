<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LogAktivitas;
use Illuminate\Http\Request;

class LogAktivitasController extends Controller
{
    public function index(Request $request)
    {
        $limit = $request->input('limit', 100);
        $logs = LogAktivitas::with('user:id_user,nama_lengkap,username')
            ->orderBy('id_log','desc')->limit($limit)->get();
        return response()->json(['success'=>true,'data'=>$logs]);
    }
}