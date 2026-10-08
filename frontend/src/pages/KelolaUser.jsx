import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';

export default function KelolaUser() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState(null);
  const [form, setForm] = useState({ username:'', password:'', nama_lengkap:'', role:'peminjam', no_telp:'' });
  const { showToast, ToastComponent } = useToast();
  const { confirm, ConfirmComponent } = useConfirm();

  const fetchUsers = () => {
    setLoading(true);
    api.get('/user').then(r => setUsers(r.data.data)).finally(() => setLoading(false));
  };
  useEffect(fetchUsers, []);

  const openAdd = () => {
    setEdit(null);
    setForm({ username:'', password:'', nama_lengkap:'', role:'peminjam', no_telp:'' });
    setModal(true);
  };
  const openEdit = (u) => {
    setEdit(u);
    setForm({ username:u.username, password:'', nama_lengkap:u.nama_lengkap, role:u.role, no_telp:u.no_telp||'' });
    setModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (edit) {
        await api.put(`/user/${edit.id_user}`, form);
        showToast('success', 'User berhasil diupdate!');
      } else {
        await api.post('/user', form);
        showToast('success', 'User baru berhasil ditambahkan!');
      }
      fetchUsers();
      setTimeout(() => setModal(false), 800);
    } catch (err) {
      const errs = err.response?.data?.errors;
      const errorMsg = errs ? Object.values(errs).flat()[0] : (err.response?.data?.message || 'Gagal menyimpan user');
      showToast('error', errorMsg);
    }
  };

  const hapus = async (id, username) => {
    const ok = await confirm({
      type: 'danger',
      title: 'Hapus User?',
      message: `User "${username}" akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
    });
    if (!ok) return;

    try {
      await api.delete(`/user/${id}`);
      showToast('success', `User "${username}" berhasil dihapus!`);
      fetchUsers();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Gagal hapus user');
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
            <h2 className="text-2xl font-bold text-slate-800">Kelola User</h2>
            <p className="text-sm text-slate-500">Total {users.length} pengguna</p>
          </div>
          <button onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-200 hover:shadow-xl transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Tambah User
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Username</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nama</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Role</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id_user} className="hover:bg-slate-50/50">
                  <td className="px-5 py-4 font-mono text-sm text-slate-700">@{u.username}</td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-800">{u.nama_lengkap}</p>
                    <p className="text-xs text-slate-400">{u.no_telp || '-'}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${
                      u.role === 'admin' ? 'bg-indigo-50 text-indigo-700' :
                      u.role === 'petugas' ? 'bg-emerald-50 text-emerald-700' :
                      'bg-amber-50 text-amber-700'
                    }`}>{u.role}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${u.is_active ? 'text-emerald-600' : 'text-rose-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {u.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right space-x-2">
                    <button onClick={() => openEdit(u)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold">
                      Edit
                    </button>
                    <button onClick={() => hapus(u.id_user, u.username)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-semibold">
                      Hapus
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
                <h3 className="font-bold text-slate-800">{edit ? 'Edit User' : 'Tambah User'}</h3>
                <button type="button" onClick={() => setModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>
              <div className="p-5 space-y-3">
                <input type="text" placeholder="Username" required value={form.username}
                  onChange={e => setForm({...form, username:e.target.value})}
                  disabled={!!edit}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl disabled:bg-slate-50" />
                <input type="password" placeholder={edit ? 'Password (kosongkan jika tidak diubah)' : 'Password'} required={!edit} value={form.password}
                  onChange={e => setForm({...form, password:e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" />
                <input type="text" placeholder="Nama Lengkap" required value={form.nama_lengkap}
                  onChange={e => setForm({...form, nama_lengkap:e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" />
                <input type="text" placeholder="No. Telp" value={form.no_telp}
                  onChange={e => setForm({...form, no_telp:e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl" />
                <select value={form.role} onChange={e => setForm({...form, role:e.target.value})}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white">
                  <option value="admin">Admin</option>
                  <option value="petugas">Petugas</option>
                  <option value="peminjam">Peminjam</option>
                </select>
              </div>
              <div className="p-5 border-t flex gap-2">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium">Batal</button>
                <button type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold">Simpan</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}