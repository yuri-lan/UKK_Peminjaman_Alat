import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function RiwayatSaya() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [pagination, setPagination] = useState({
    current_page: 1, last_page: 1, total: 0, from: 0, to: 0
  });
  const { user } = useAuth();

  const fetchData = () => {
    setLoading(true);
    api.get(`/peminjaman?page=${page}&per_page=${perPage}`)
      .then(r => {
        setData(r.data.data || []);
        if (r.data.pagination) setPagination(r.data.pagination);
      })
      .catch(err => console.error('Error fetch riwayat:', err))
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, [page, perPage]); // eslint-disable-line

  const statusBadge = (s) => ({
    diajukan:     'bg-amber-50 text-amber-700 border-amber-200',
    disetujui:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    ditolak:      'bg-rose-50 text-rose-700 border-rose-200',
    dikembalikan: 'bg-slate-100 text-slate-700 border-slate-200',
  }[s] || 'bg-slate-100 text-slate-700 border-slate-200');

  const totalPages = pagination.last_page || 1;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Riwayat Peminjaman Saya</h2>
        <p className="text-sm text-slate-500">
          {pagination.total > 0
            ? `Total ${pagination.total} peminjaman`
            : 'Belum ada riwayat'}
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <svg className="animate-spin h-10 w-10 mx-auto text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-slate-500 mt-3 text-sm">Memuat riwayat...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-slate-500">Belum ada riwayat peminjaman</p>
          <p className="text-xs text-slate-400 mt-1">Ajukan peminjaman dari halaman Home</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3">
            {data.map(p => {
              const denda = parseFloat(p.pengembalian?.denda || 0);
              const adaDenda = denda > 0;
              const sudahLunas = p.pengembalian?.denda_lunas == 1;

              return (
                <div key={p.id_pinjam}
                  className={`bg-white rounded-2xl shadow-sm border p-5 ${
                    adaDenda && !sudahLunas ? 'border-rose-200' : 'border-slate-100'
                  }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono text-xs bg-slate-100 inline-block px-2 py-1 rounded">
                        {p.kode_pinjam}
                      </p>
                      <h3 className="font-bold text-slate-800 mt-2">{p.alat?.nama_alat || '-'}</h3>
                      <p className="text-sm text-slate-500">Jumlah: {p.jumlah}</p>
                    </div>
                    <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border ${statusBadge(p.status)}`}>
                      {p.status}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <div>Pinjam: <b className="text-slate-700">{p.tgl_pinjam}</b></div>
                    <div>Rencana Kembali: <b className="text-slate-700">{p.tgl_rencana_kembali}</b></div>
                    {p.tgl_kembali_aktual && (
                      <div>Kembali Aktual: <b className="text-slate-700">{p.tgl_kembali_aktual}</b></div>
                    )}
                  </div>

                  {/* Info Denda */}
                  {adaDenda && (
                    <div className={`mt-3 p-3 rounded-xl border flex items-start gap-3 ${
                      sudahLunas
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-rose-50 border-rose-200'
                    }`}>
                      <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${sudahLunas ? 'text-emerald-600' : 'text-rose-600'}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {sudahLunas ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        )}
                      </svg>
                      <div className="flex-1">
                        <p className={`font-bold text-sm ${sudahLunas ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {sudahLunas ? '✅ Denda sudah LUNAS' : '⚠️ Anda dikenakan denda'}
                        </p>
                        <p className={`text-xs mt-0.5 ${sudahLunas ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {sudahLunas
                            ? 'Terima kasih, denda sudah dibayar ke petugas.'
                            : 'Silakan bayar denda ke petugas untuk menyelesaikan.'}
                        </p>
                        <p className={`text-lg font-bold mt-1 ${sudahLunas ? 'text-emerald-700 line-through' : 'text-rose-700'}`}>
                          Rp {denda.toLocaleString('id-ID')}
                        </p>
                        {sudahLunas && p.pengembalian?.tgl_lunas && (
                          <p className="text-xs text-slate-400 mt-1 italic">
                            Dilunasi: {new Date(p.pengembalian.tgl_lunas).toLocaleString('id-ID')}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Kalau dikembalikan tanpa denda */}
                  {p.status === 'dikembalikan' && !adaDenda && p.pengembalian && (
                    <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-emerald-700 font-medium">
                        Alat dikembalikan tepat waktu. Terima kasih! ✅
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-5 py-4 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span>
                  Menampilkan <b className="text-slate-700">{pagination.from}</b> -{' '}
                  <b className="text-slate-700">{pagination.to}</b> dari{' '}
                  <b className="text-slate-700">{pagination.total}</b>
                </span>
                <select value={perPage}
                  onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                  className="px-2 py-1 border border-slate-200 rounded-lg text-xs bg-white">
                  <option value={5}>5 / hal</option>
                  <option value={10}>10 / hal</option>
                  <option value={25}>25 / hal</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={page === 1}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  «
                </button>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  ‹ Prev
                </button>
                <span className="px-3 py-1.5 text-xs text-slate-600">
                  Hal <b>{page}</b> / {totalPages}
                </span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  Next ›
                </button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">
                  »
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}