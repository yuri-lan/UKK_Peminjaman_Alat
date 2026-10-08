import { useEffect, useState } from 'react';
import api from '../api/axios';

export default function LogAktivitas() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/log-aktivitas?limit=100')
      .then(r => setLogs(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-500">Memuat...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Log Aktivitas</h2>
        <p className="text-sm text-slate-500">Riwayat aksi sistem ({logs.length} entri terakhir)</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Waktu</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">User</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Aksi</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Tabel</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Deskripsi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400 text-sm">Belum ada aktivitas</td></tr>
            ) : logs.map(l => (
              <tr key={l.id_log} className="hover:bg-slate-50/50">
                <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                  {new Date(l.waktu).toLocaleString('id-ID')}
                </td>
                <td className="px-5 py-3 text-sm">
                  {l.user ? <span className="font-medium text-slate-700">{l.user.nama_lengkap}</span> : <span className="text-slate-400 italic">system</span>}
                </td>
                <td className="px-5 py-3">
                  <span className="inline-flex px-2 py-1 rounded-lg text-xs font-mono font-semibold bg-indigo-50 text-indigo-700">{l.aksi}</span>
                </td>
                <td className="px-5 py-3 text-xs text-slate-500 font-mono">{l.tabel_terkait || '-'}</td>
                <td className="px-5 py-3 text-sm text-slate-600">{l.deskripsi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}