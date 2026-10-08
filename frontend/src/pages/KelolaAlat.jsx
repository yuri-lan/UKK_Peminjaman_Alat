import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';

export default function KelolaAlat() {
  const [alat, setAlat] = useState([]);
  const [kategori, setKategori] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ kode_alat:'', nama_alat:'', id_kategori:'', stok_total:0, kondisi:'Baik' });
  const { showToast, ToastComponent } = useToast();
  const { confirm, ConfirmComponent } = useConfirm();

  const fetchAll = async () => {
    setLoading(true);
    const [a, k] = await Promise.all([api.get('/alat?limit=100'), api.get('/kategori')]);
    setAlat(a.data.data);
    setKategori(k.data.data);
    setLoading(false);
  };
  useEffect(() => { fetchAll(); }, []);

  const openAdd = () => {
    setEdit(null);
    setForm({ kode_alat:'', nama_alat:'', id_kategori: kategori[0]?.id_kategori || '', stok_total:0, kondisi:'Baik' });
    setModal(true);
  };
  const openEdit = (a) => {
    setEdit(a);
    setForm({ kode_alat:a.kode_alat, nama_alat:a.nama_alat, id_kategori:a.id_kategori, stok_total:a.stok_total, kondisi:a.kondisi });
    setModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (edit) {
        await api.put(`/alat/${edit.id_alat}`, form);
        showToast('success', 'Alat berhasil diupdate!');
      } else {
        await api.post('/alat', form);
        showToast('success', 'Alat baru berhasil ditambahkan!');
      }
      fetchAll();
      setTimeout(() => setModal(false), 800);
    } catch (err) {
      const errs = err.response?.data?.errors;
      showToast('error', errs ? Object.values(errs).flat()[0] : 'Gagal menyimpan alat');
    }
  };

  const hapus = async (id, nama) => {
    const ok = await confirm({
      type: 'danger',
      title: 'Hapus Alat?',
      message: `Alat "${nama}" akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
    });
    if (!ok) return;

    try {
      await api.delete(`/alat/${id}`);
      showToast('success', `Alat "${nama}" berhasil dihapus!`);
      fetchAll();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Gagal hapus alat');
    }
  };

  if (loading) return <div className="text-slate-500">Memuat...</div>;

  return (
    <>
      {ToastComponent}
      {ConfirmComponent}

      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Kelola Alat</h2>
            <p className="text-sm text-slate-500">Total {alat.length} alat</p>
          </div>
          <button onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200">
            + Tambah Alat
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Kode</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nama</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Kategori</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Stok</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Kondisi</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alat.map(a => (
                <tr key={a.id_alat} className="hover:bg-slate-50/50">
                  <td className="px-5 py-4"><span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{a.kode_alat}</span></td>
                  <td className="px-5 py-4 font-medium text-slate-800">{a.nama_alat}</td>
                  <td className="px-5 py-4 text-sm text-slate-600">{a.kategori?.nama_kategori || '-'}</td>
                  <td className="px-5 py-4 text-sm font-semibold">{a.stok_tersedia} / {a.stok_total}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                      a.kondisi === 'Baik' ? 'bg-emerald-50 text-emerald-700' :
                      a.kondisi === 'Rusak Ringan' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                    }`}>{a.kondisi}</span>
                  </td>
                  <td className="px-5 py-4 text-right space-x-2">
                    <button onClick={() => openEdit(a)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold">Edit</button>
                    <button onClick={() => hapus(a.id_alat, a.nama_alat)} className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-semibold">Hapus</button>
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
                <h3 className="font-bold text-slate-800">{edit ? 'Edit Alat' : 'Tambah Alat'}</h3>
                <button type="button" onClick={() => setModal(false)} className="text-slate-400">✕</button>
              </div>
              <div className="p-5 space-y-3">
                <input required placeholder="Kode Alat" value={form.kode_alat} disabled={!!edit}
                  onChange={e => setForm({...form, kode_alat:e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl disabled:bg-slate-50" />
                <input required placeholder="Nama Alat" value={form.nama_alat}
                  onChange={e => setForm({...form, nama_alat:e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" />
                <select required value={form.id_kategori} onChange={e => setForm({...form, id_kategori:e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white">
                  <option value="">Pilih Kategori</option>
                  {kategori.map(k => <option key={k.id_kategori} value={k.id_kategori}>{k.nama_kategori}</option>)}
                </select>
                <input type="number" min="0" required placeholder="Stok Total" value={form.stok_total}
                  onChange={e => setForm({...form, stok_total:e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" />
                <select value={form.kondisi} onChange={e => setForm({...form, kondisi:e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white">
                  <option>Baik</option><option>Rusak Ringan</option><option>Rusak Berat</option>
                </select>
              </div>
              <div className="p-5 border-t flex gap-2">
                <button type="button" onClick={() => setModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600">Batal</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold">Simpan</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}