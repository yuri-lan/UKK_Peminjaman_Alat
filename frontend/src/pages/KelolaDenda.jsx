import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';

export default function KelolaDenda() {
  const [data, setData] = useState([]);
  const [statistik, setStatistik] = useState({ total_belum_lunas: 0, jumlah_belum_lunas: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('belum');
  const { showToast, ToastComponent } = useToast();
  const { confirm, ConfirmComponent } = useConfirm();

  const fetchData = () => {
    setLoading(true);
    api.get(`/denda?status=${filter}`)
      .then(r => {
        setData(r.data.data);
        setStatistik(r.data.statistik);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [filter]);

  const tandaiLunas = async (id, namaPeminjam, denda) => {
    const ok = await confirm({
      type: 'success',
      title: 'Tandai Lunas?',
      message: `Konfirmasi pelunasan denda Rp${parseFloat(denda).toLocaleString('id-ID')} dari ${namaPeminjam}. Setelah ini status akan berubah jadi LUNAS.`,
      confirmText: 'Ya, Lunas',
      cancelText: 'Batal',
    });
    if (!ok) return;

    try {
      const res = await api.put(`/denda/${id}/lunas`);
      showToast('success', res.data.message);
      fetchData();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Gagal tandai lunas');
    }
  };

  if (loading) return <div className="text-slate-500">Memuat...</div>;

  return (
    <>
      {ToastComponent}
      {ConfirmComponent}

      <div className="max-w-7xl mx-auto space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Kelola Denda</h2>
          <p className="text-sm text-slate-500">Kelola pembayaran denda keterlambatan peminjaman</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-5 text-white shadow-lg shadow-rose-200/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm opacity-90 font-medium">Total Belum Lunas</p>
            </div>
            <p className="text-3xl font-bold">
              Rp {parseFloat(statistik.total_belum_lunas || 0).toLocaleString('id-ID')}
            </p>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg shadow-amber-200/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm opacity-90 font-medium">Jumlah Peminjam</p>
            </div>
            <p className="text-3xl font-bold">{statistik.jumlah_belum_lunas || 0} <span className="text-lg font-medium opacity-80">orang</span></p>
          </div>
        </div>

        <div className="flex gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-slate-100 w-fit">
          {[
            { key: 'belum', label: 'Belum Lunas' },
            { key: 'lunas', label: 'Lunas' },
            { key: 'semua', label: 'Semua' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                filter === f.key
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Peminjam</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Alat</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Tgl Kembali</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Denda</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">
                    <svg className="w-16 h-16 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>Tidak ada data denda{filter === 'belum' ? ' yang belum lunas' : ''}</p>
                  </td>
                </tr>
              ) : data.map(d => (
                <tr key={d.id_kembali} className="hover:bg-slate-50/50">
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-800">{d.peminjaman?.user?.nama_lengkap || '-'}</p>
                    <p className="text-xs text-slate-400">@{d.peminjaman?.user?.username || '-'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm text-slate-700">{d.peminjaman?.alat?.nama_alat || '-'}</p>
                    <p className="text-xs text-slate-400 font-mono">{d.peminjaman?.kode_pinjam}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-600">{d.tgl_kembali}</td>
                  <td className="px-5 py-4">
                    <span className="font-bold text-rose-600 text-base">
                      Rp {parseFloat(d.denda).toLocaleString('id-ID')}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {d.denda_lunas ? (
                      <div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          LUNAS
                        </span>
                        <p className="text-xs text-slate-400 mt-1">
                          oleh {d.petugas_lunas?.nama_lengkap || '-'}
                        </p>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        BELUM LUNAS
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {!d.denda_lunas && (
                      <button
                        onClick={() => tandaiLunas(d.id_kembali, d.peminjaman?.user?.nama_lengkap, d.denda)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-200 hover:shadow-lg transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Tandai Lunas
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}