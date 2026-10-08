<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class RoleMiddleware
{
    public function handle(Request $request, Closure $next, ...$roles)
    {
        // Ambil user dari guard sanctum secara eksplisit
        // Jangan pakai $request->user() doang, karena default-nya guard 'web'
        $user = Auth::guard('sanctum')->user() ?? $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        if (!in_array($user->role, $roles)) {
            return response()->json([
                'message' => 'Forbidden: role tidak diizinkan'
            ], 403);
        }

        return $next($request);
    }
}