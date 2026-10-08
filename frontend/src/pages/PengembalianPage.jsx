import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useToast } from '../hooks/useToast';

export default function PengembalianPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ tgl_kembali: new Date().toISOString().split('T')[0], kondisi_saat_kembali:'Baik' });
  const { showToast, ToastComponent } = useToast();

  const fetchData = () => {
    setLoading(true);
    api.get('/peminjaman?status=disetujui').then(r => setData(r.data.data)).finally(() => setLoading(false));
  };
  useEffect(fetchData, []);

  const openModal = (p) => {
    setSelected(p);
    setForm({ tgl_kembali: new Date().toISOString().split('T')[0], kondisi_saat_kembali:'Baik' });
    setModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/pengembalian', { id_pinjam: selected.id_pinjam, ...form });
      showToast('success', res.data.message);
      fetchData();
      setTimeout(() => setModal(false), 1500);
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Gagal proses pengembalian');
    }
  };

  if (loading) return <div className="text-slate-500">Memuat...</div>;

  return (
    <>
      {ToastComponent}

      <div className="max-w-6xl mx-auto space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Proses Pengembalian</h2>
          <p className="text-sm text-slate-500">{data.length} peminjaman aktif</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Kode</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Peminjam</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Alat</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Rencana Kembali</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400 text-sm">Tidak ada peminjaman aktif</td></tr>
              ) : data.map(p => (
                <tr key={p.id_pinjam} className="hover:bg-slate-50/50">
                  <td className="px-5 py-4"><span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{p.kode_pinjam}</span></td>
                  <td className="px-5 py-4 text-sm font-medium text-slate-700">{p.user?.nama_lengkap}</td>
                  <td className="px-5 py-4 text-sm">{p.alat?.nama_alat} <span className="text-slate-400">x{p.jumlah}</span></td>
                  <td className="px-5 py-4 text-sm text-slate-600">{p.tgl_rencana_kembali}</td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => openModal(p)}
                      className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-xs font-semibold">
                      Proses Kembali
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {modal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-5 border-b flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-800">Proses Pengembalian</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selected?.kode_pinjam} — {selected?.alat?.nama_alat}</p>
                </div>
                <button type="button" onClick={() => setModal(false)} className="text-slate-400">✕</button>
              </div>
              <div className="p-5 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Tanggal Kembali Aktual</label>
                  <input type="date" required value={form.tgl_kembali}
                    onChange={e => setForm({...form, tgl_kembali:e.target.value})}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Kondisi Saat Kembali</label>
                  <select value={form.kondisi_saat_kembali} onChange={e => setForm({...form, kondisi_saat_kembali:e.target.value})}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white">
                    <option>Baik</option><option>Rusak Ringan</option><option>Rusak Berat</option>
                  </select>
                </div>
                <p className="text-xs text-slate-400 bg-slate-50 p-2 rounded-lg">
                  💡 Denda otomatis dihitung: Rp 2.000/hari keterlambatan (maks Rp 100.000)
                </p>
              </div>
              <div className="p-5 border-t flex gap-2">
                <button type="button" onClick={() => setModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600">Batal</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold">Proses</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}