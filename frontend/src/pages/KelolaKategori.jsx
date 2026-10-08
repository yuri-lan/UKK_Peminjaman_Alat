import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';

export default function KelolaKategori() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ nama_kategori:'', deskripsi:'' });
  const { showToast, ToastComponent } = useToast();
  const { confirm, ConfirmComponent } = useConfirm();

  const fetchData = () => {
    setLoading(true);
    api.get('/kategori').then(r => setData(r.data.data)).finally(() => setLoading(false));
  };
  useEffect(fetchData, []);

  const openAdd = () => { setEdit(null); setForm({ nama_kategori:'', deskripsi:'' }); setModal(true); };
  const openEdit = (k) => { setEdit(k); setForm({ nama_kategori:k.nama_kategori, deskripsi:k.deskripsi||'' }); setModal(true); };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (edit) {
        await api.put(`/kategori/${edit.id_kategori}`, form);
        showToast('success', 'Kategori berhasil diupdate!');
      } else {
        await api.post('/kategori', form);
        showToast('success', 'Kategori baru berhasil ditambahkan!');
      }
      fetchData();
      setModal(false);
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Gagal simpan kategori');
    }
  };

  const hapus = async (id, nama) => {
    const ok = await confirm({
      type: 'danger',
      title: 'Hapus Kategori?',
      message: `Kategori "${nama}" akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
    });
    if (!ok) return;

    try {
      await api.delete(`/kategori/${id}`);
      showToast('success', `Kategori "${nama}" berhasil dihapus!`);
      fetchData();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Gagal hapus kategori');
    }
  };

  if (loading) return <div className="text-slate-500">Memuat...</div>;

  return (
    <>
      {ToastComponent}
      {ConfirmComponent}

      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Kelola Kategori</h2>
            <p className="text-sm text-slate-500">Total {data.length} kategori</p>
          </div>
          <button onClick={openAdd}
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold">
            + Tambah Kategori
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nama</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Deskripsi</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map(k => (
                <tr key={k.id_kategori} className="hover:bg-slate-50/50">
                  <td className="px-5 py-4 font-medium text-slate-800">{k.nama_kategori}</td>
                  <td className="px-5 py-4 text-sm text-slate-500">{k.deskripsi || '-'}</td>
                  <td className="px-5 py-4 text-right space-x-2">
                    <button onClick={() => openEdit(k)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold">Edit</button>
                    <button onClick={() => hapus(k.id_kategori, k.nama_kategori)} className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-semibold">Hapus</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {modal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <form onSubmit={submit} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-3">
              <h3 className="font-bold text-lg">{edit ? 'Edit Kategori' : 'Tambah Kategori'}</h3>
              <input required placeholder="Nama Kategori" value={form.nama_kategori}
                onChange={e => setForm({...form, nama_kategori:e.target.value})}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" />
              <textarea placeholder="Deskripsi" value={form.deskripsi}
                onChange={e => setForm({...form, deskripsi:e.target.value})}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" rows="3" />
              <div className="flex gap-2">
                <button type="button" onClick={() => setModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200">Batal</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold">Simpan</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}