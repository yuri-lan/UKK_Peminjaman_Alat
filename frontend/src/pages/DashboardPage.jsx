import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import AlatList from '../components/AlatList';

export default function DashboardPage() {
  const { user } = useAuth();
  const [totalDenda, setTotalDenda] = useState(0);
  const [jumlahDenda, setJumlahDenda] = useState(0);

  // Fetch denda kalau user adalah peminjam
  useEffect(() => {
    if (user?.role === 'peminjam') {
      api.get('/peminjaman')
        .then(r => {
          const dendaList = r.data.data.filter(p => 
            parseFloat(p.pengembalian?.denda || 0) > 0 && 
            !p.pengembalian?.denda_lunas   // ← FILTER DENDA YANG BELUM LUNAS
            );
          const total = dendaList.reduce((sum, p) => sum + parseFloat(p.pengembalian.denda), 0);
          setTotalDenda(total);
          setJumlahDenda(dendaList.length);
        })
        .catch(err => console.error('Gagal fetch denda:', err));
    }
  }, [user]);

  const roleColor = {
    admin:    'from-indigo-500 to-purple-600',
    petugas:  'from-emerald-500 to-teal-600',
    peminjam: 'from-amber-500 to-orange-600',
  }[user?.role] || 'from-slate-500 to-slate-600';

  const menu = {
    admin: [
      { to: 'user',     name: 'Kelola User',     desc: 'Manajemen pengguna',   icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
      { to: 'alat',     name: 'Kelola Alat',     desc: 'CRUD data alat',       icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
      { to: 'kategori', name: 'Kelola Kategori', desc: 'CRUD kategori',        icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z' },
      { to: 'log',      name: 'Log Aktivitas',   desc: 'Audit trail sistem',   icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    ],
    petugas: [
    { to: 'peminjaman',   name: 'Peminjaman Masuk',    desc: 'Approve / tolak',   icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { to: 'pengembalian', name: 'Proses Pengembalian', desc: 'Kelola denda',      icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
    { to: 'denda',        name: 'Kelola Denda',        desc: 'Pelunasan denda',   icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    ],
    peminjam: [
      { to: 'riwayat', name: 'Riwayat Saya', desc: 'Lihat peminjaman', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    ],
  }[user?.role] || [];

  return (
    <div className="space-y-6">

      {/* Welcome Banner */}
      <div className={`rounded-2xl bg-gradient-to-r ${roleColor} p-6 text-white shadow-lg`}>
        <h2 className="text-2xl font-bold">
          Selamat datang, {user?.nama_lengkap?.split(' ')[0]}! 👋
        </h2>
        <p className="opacity-90 mt-1 text-sm">
          Anda login sebagai <b className="capitalize">{user?.role}</b> ·{' '}
          {new Date().toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* 🚨 BANNER DENDA untuk Peminjam */}
      {user?.role === 'peminjam' && totalDenda > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-5 flex items-start gap-4 shadow-sm animate-pulse-subtle">
          <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-bold text-rose-800 text-base">
              ⚠️ Anda memiliki denda keterlambatan
            </p>
            <p className="text-sm text-rose-600 mt-1">
              Dari <b>{jumlahDenda}</b> peminjaman yang terlambat dikembalikan.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-2xl font-bold text-rose-700">
                Rp {totalDenda.toLocaleString('id-ID')}
              </span>
              <Link
                to="riwayat"
                className="text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                Lihat Detail →
              </Link>
            </div>
            <p className="text-xs text-rose-500 mt-2">
              💡 Segera bayar denda ke petugas untuk menyelesaikan peminjaman.
            </p>
          </div>
        </div>
      )}

      {/* ✅ BANNER SUKSES kalau peminjam bersih tanpa denda */}
      {user?.role === 'peminjam' && totalDenda === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-emerald-800 text-sm">Status peminjaman aman ✅</p>
            <p className="text-xs text-emerald-600">
              Tidak ada denda keterlambatan. Tetap disiplin mengembalikan alat ya!
            </p>
          </div>
        </div>
      )}

      {/* Menu Cepat */}
      {menu.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Menu Cepat
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {menu.map((m, i) => (
              <Link
                key={i}
                to={m.to}
                className="group bg-white p-5 rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 hover:border-indigo-200 transition-all flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={m.icon} />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">
                    {m.name}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{m.desc}</p>
                </div>
                <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Daftar Alat */}
      <AlatList />
    </div>
  );
}