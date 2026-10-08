import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';

export default function AlatList() {
  const [alat, setAlat] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedAlat, setSelectedAlat] = useState(null);
  const [formPinjam, setFormPinjam] = useState({
    tgl_pinjam: new Date().toISOString().split('T')[0],
    tgl_rencana_kembali: '',
    jumlah: 1,
  });
  const { user } = useAuth();
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    fetchAlat();
  }, []);

  const fetchAlat = () => {
    setLoading(true);
    api.get('/alat?limit=20')
      .then(res => setAlat(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  const openPinjamModal = (a) => {
    setSelectedAlat(a);
    setFormPinjam({
      tgl_pinjam: new Date().toISOString().split('T')[0],
      tgl_rencana_kembali: '',
      jumlah: 1,
    });
    setShowModal(true);
  };

  const handlePinjam = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/peminjaman', {
        id_alat: selectedAlat.id_alat,
        ...formPinjam,
        jumlah: parseInt(formPinjam.jumlah),
      });
      showToast('success', res.data.message);
      fetchAlat();
      setTimeout(() => setShowModal(false), 1500);
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Gagal meminjam');
    }
  };

  const filtered = alat.filter(a =>
    a.nama_alat.toLowerCase().includes(search.toLowerCase()) ||
    a.kode_alat.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
        <svg className="animate-spin h-10 w-10 mx-auto text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-slate-500 mt-3 text-sm">Memuat data alat...</p>
      </div>
    );
  }

  return (
    <>
      {ToastComponent}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Daftar Alat</h3>
            <p className="text-sm text-slate-500">Total {alat.length} alat terdaftar</p>
          </div>
          <div className="relative w-full sm:w-72">
            <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Cari alat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Kode</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Alat</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Stok</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Kondisi</th>
                {user?.role === 'peminjam' && (
                  <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                    <svg className="w-16 h-16 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-sm">Belum ada data alat</p>
                  </td>
                </tr>
              ) : (
                filtered.map(a => {
                  const stokKosong = a.stok_tersedia === 0;
                  const persen = a.stok_total > 0 ? (a.stok_tersedia / a.stok_total) * 100 : 0;
                  return (
                    <tr key={a.id_alat} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-mono font-semibold bg-slate-100 text-slate-700">
                          {a.kode_alat}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-800">{a.nama_alat}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{a.kategori?.nama_kategori || '-'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${stokKosong ? 'text-rose-600' : 'text-slate-700'}`}>
                            {a.stok_tersedia}
                          </span>
                          <span className="text-xs text-slate-400">/ {a.stok_total}</span>
                        </div>
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              persen === 0 ? 'bg-rose-500' : persen < 30 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${persen}%` }}
                          />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                          a.kondisi === 'Baik' ? 'bg-emerald-50 text-emerald-700' :
                          a.kondisi === 'Rusak Ringan' ? 'bg-amber-50 text-amber-700' :
                          'bg-rose-50 text-rose-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            a.kondisi === 'Baik' ? 'bg-emerald-500' :
                            a.kondisi === 'Rusak Ringan' ? 'bg-amber-500' : 'bg-rose-500'
                          }`} />
                          {a.kondisi}
                        </span>
                      </td>
                      {user?.role === 'peminjam' && (
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => openPinjamModal(a)}
                            disabled={stokKosong}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                              stokKosong
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            {stokKosong ? 'Habis' : 'Pinjam'}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Pinjam */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">Ajukan Peminjaman</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedAlat?.nama_alat}</p>
              </div>
              <button onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handlePinjam} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal Pinjam</label>
                <input
                  type="date"
                  required
                  value={formPinjam.tgl_pinjam}
                  onChange={(e) => setFormPinjam({ ...formPinjam, tgl_pinjam: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Rencana Kembali</label>
                <input
                  type="date"
                  required
                  min={formPinjam.tgl_pinjam}
                  value={formPinjam.tgl_rencana_kembali}
                  onChange={(e) => setFormPinjam({ ...formPinjam, tgl_rencana_kembali: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Jumlah <span className="text-slate-400">(maks. {selectedAlat?.stok_tersedia})</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={selectedAlat?.stok_tersedia}
                  value={formPinjam.jumlah}
                  onChange={(e) => setFormPinjam({ ...formPinjam, jumlah: e.target.value })}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg shadow-indigo-200 hover:shadow-xl transition-all"
                >
                  Ajukan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}