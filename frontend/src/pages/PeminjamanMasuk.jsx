import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const EMPTY_FILTER = {
  q: '',
  status: '',
  id_alat: '',
  id_user: '',
  tgl_pinjam_dari: '',
  tgl_pinjam_sampai: '',
  tgl_kembali_dari: '',
  tgl_kembali_sampai: '',
};

export default function PeminjamanMasuk() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formFilter, setFormFilter] = useState(EMPTY_FILTER);
  const [appliedFilter, setAppliedFilter] = useState(EMPTY_FILTER);
  const [showFilter, setShowFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [pagination, setPagination] = useState({
    current_page: 1, last_page: 1, total: 0, from: 0, to: 0
  });
  const [alatList, setAlatList] = useState([]);
  const [userList, setUserList] = useState([]);
  const [exporting, setExporting] = useState(false);

  const { showToast, ToastComponent } = useToast();
  const { confirm, ConfirmComponent } = useConfirm();

  // Fetch master data
  useEffect(() => {
    Promise.all([
      api.get('/peminjaman/alat-list').catch(() => ({ data: { data: [] } })),
      api.get('/peminjaman/peminjam-list').catch(() => ({ data: { data: [] } })),
    ]).then(([a, u]) => {
      setAlatList(a.data.data || []);
      setUserList(u.data.data || []);
    });
  }, []);

  const fetchData = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('per_page', perPage);
    Object.entries(appliedFilter).forEach(([k, v]) => { if (v) params.append(k, v); });

    api.get(`/peminjaman?${params.toString()}`)
      .then(r => {
        setData(r.data.data || []);
        if (r.data.pagination) setPagination(r.data.pagination);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, [page, perPage, appliedFilter]); // eslint-disable-line

  const applyFilter = () => {
    setAppliedFilter(formFilter);
    setPage(1);
    setShowFilter(false);
  };

  const resetFilter = () => {
    setFormFilter(EMPTY_FILTER);
    setAppliedFilter(EMPTY_FILTER);
    setPage(1);
  };

  const activeFilterCount = Object.values(appliedFilter).filter(Boolean).length;

  const approve = async (id, status) => {
    const isApprove = status === 'disetujui';
    const ok = await confirm({
      type: isApprove ? 'success' : 'warning',
      title: isApprove ? 'Setujui Peminjaman?' : 'Tolak Peminjaman?',
      message: isApprove
        ? 'Peminjaman ini akan disetujui dan alat siap diambil oleh peminjam.'
        : 'Peminjaman ini akan ditolak. Peminjam akan menerima notifikasi.',
      confirmText: isApprove ? 'Ya, Setujui' : 'Ya, Tolak',
      cancelText: 'Batal',
    });
    if (!ok) return;

    try {
      await api.put(`/peminjaman/${id}/approve`, { status });
      showToast('success', `Peminjaman berhasil di-${status}!`);
      fetchData();
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Gagal update status');
    }
  };

  // ============ EXPORT PDF ============
  const exportPDF = async () => {
    setExporting(true);
    try {
      // Ambil SEMUA data dengan filter yang sama (tanpa pagination)
      const params = new URLSearchParams();
      params.append('per_page', 9999);
      Object.entries(appliedFilter).forEach(([k, v]) => { if (v) params.append(k, v); });

      const res = await api.get(`/peminjaman?${params.toString()}`);
      const allData = res.data.data || [];

      if (allData.length === 0) {
        showToast('warning', 'Tidak ada data untuk diexport');
        return;
      }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('LAPORAN PEMINJAMAN ALAT', 14, 18);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Sistem Informasi Peminjaman Alat', 14, 24);
      doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 14, 30);

      // Filter aktif
      const filterTexts = [];
      if (appliedFilter.q) filterTexts.push(`Pencarian: "${appliedFilter.q}"`);
      if (appliedFilter.status) filterTexts.push(`Status: ${appliedFilter.status}`);
      if (appliedFilter.tgl_pinjam_dari) filterTexts.push(`Tgl Pinjam dari ${appliedFilter.tgl_pinjam_dari}`);
      if (appliedFilter.tgl_pinjam_sampai) filterTexts.push(`Tgl Pinjam s/d ${appliedFilter.tgl_pinjam_sampai}`);
      if (appliedFilter.tgl_kembali_dari) filterTexts.push(`Rencana Kembali dari ${appliedFilter.tgl_kembali_dari}`);
      if (appliedFilter.tgl_kembali_sampai) filterTexts.push(`Rencana Kembali s/d ${appliedFilter.tgl_kembali_sampai}`);
      if (appliedFilter.id_alat) {
        const a = alatList.find(x => String(x.id_alat) === String(appliedFilter.id_alat));
        if (a) filterTexts.push(`Alat: ${a.nama_alat}`);
      }
      if (appliedFilter.id_user) {
        const u = userList.find(x => String(x.id_user) === String(appliedFilter.id_user));
        if (u) filterTexts.push(`Peminjam: ${u.nama_lengkap}`);
      }

      doc.setFontSize(9);
      doc.text(`Total: ${allData.length} data`, 14, 36);

      let startY = 42;
      if (filterTexts.length > 0) {
        doc.text('Filter aktif:', 14, 42);
        doc.setFont('helvetica', 'italic');
        filterTexts.forEach((t, i) => {
          doc.text(`• ${t}`, 18, 47 + i * 5);
        });
        doc.setFont('helvetica', 'normal');
        startY = 47 + filterTexts.length * 5 + 4;
      }

      // Tabel
      autoTable(doc, {
        startY,
        head: [[
          'No', 'Kode', 'Peminjam', 'Alat', 'Kode Alat',
          'Tgl Pinjam', 'Rencana Kembali', 'Jml', 'Status'
        ]],
        body: allData.map((p, i) => [
          i + 1,
          p.kode_pinjam || '-',
          p.user?.nama_lengkap || '-',
          p.alat?.nama_alat || '-',
          p.alat?.kode_alat || '-',
          p.tgl_pinjam || '-',
          p.tgl_rencana_kembali || '-',
          p.jumlah || 0,
          p.status || '-',
        ]),
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: {
          fillColor: [99, 102, 241],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          7: { halign: 'center', cellWidth: 12 },
          8: { halign: 'center' },
        },
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(
          `Halaman ${i} dari ${pageCount}`,
          doc.internal.pageSize.getWidth() - 40,
          doc.internal.pageSize.getHeight() - 8
        );
      }

      const filename = `laporan-peminjaman-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
      showToast('success', `PDF berhasil dibuat (${allData.length} data)`);
    } catch (err) {
      console.error(err);
      showToast('error', 'Gagal membuat PDF');
    } finally {
      setExporting(false);
    }
  };

  const statusBadge = (s) => {
    const map = {
      diajukan:     'bg-amber-50 text-amber-700',
      disetujui:    'bg-emerald-50 text-emerald-700',
      ditolak:      'bg-rose-50 text-rose-700',
      dikembalikan: 'bg-slate-100 text-slate-700',
    };
    return map[s] || 'bg-slate-100 text-slate-700';
  };

  const totalPages = pagination.last_page || 1;

  return (
    <>
      {ToastComponent}
      {ConfirmComponent}

      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Peminjaman Masuk</h2>
            <p className="text-sm text-slate-500">
              {data.filter(d => d.status === 'diajukan').length} pengajuan menunggu · Total {pagination.total} data
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold border-2 transition-all ${
                showFilter || activeFilterCount > 0
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter
              {activeFilterCount > 0 && (
                <span className="bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              onClick={exportPDF}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-200 hover:shadow-xl transition-all disabled:opacity-60"
            >
              {exporting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Membuat...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export PDF
                </>
              )}
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilter && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 animate-slideUp">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800">🔍 Filter Data</h3>
              <button onClick={resetFilter}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold">
                Reset Filter
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Pencarian */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Pencarian</label>
                <input type="text" placeholder="Kode, peminjam, alat..."
                  value={formFilter.q}
                  onChange={(e) => setFormFilter({ ...formFilter, q: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                <select value={formFilter.status}
                  onChange={(e) => setFormFilter({ ...formFilter, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                  <option value="">Semua Status</option>
                  <option value="diajukan">Menunggu Keputusan</option>
                  <option value="disetujui">Disetujui</option>
                  <option value="ditolak">Ditolak</option>
                  <option value="dikembalikan">Dikembalikan</option>
                </select>
              </div>

              {/* Peminjam */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Peminjam</label>
                <select value={formFilter.id_user}
                  onChange={(e) => setFormFilter({ ...formFilter, id_user: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                  <option value="">Semua Peminjam</option>
                  {userList.map(u => (
                    <option key={u.id_user} value={u.id_user}>
                        {u.nama_lengkap}
                    </option>
                    ))}
                </select>
              </div>

              {/* Alat */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Alat</label>
                <select value={formFilter.id_alat}
                  onChange={(e) => setFormFilter({ ...formFilter, id_alat: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white">
                  <option value="">Semua Alat</option>
                  {alatList.map(a => (
                    <option key={a.id_alat} value={a.id_alat}>{a.kode_alat} — {a.nama_alat}</option>
                  ))}
                </select>
              </div>

              {/* Tanggal Pinjam */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tgl Pinjam (dari)</label>
                <input type="date" value={formFilter.tgl_pinjam_dari}
                  onChange={(e) => setFormFilter({ ...formFilter, tgl_pinjam_dari: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tgl Pinjam (sampai)</label>
                <input type="date" value={formFilter.tgl_pinjam_sampai}
                  onChange={(e) => setFormFilter({ ...formFilter, tgl_pinjam_sampai: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
              </div>

              {/* Tanggal Kembali */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Rencana Kembali (dari)</label>
                <input type="date" value={formFilter.tgl_kembali_dari}
                  onChange={(e) => setFormFilter({ ...formFilter, tgl_kembali_dari: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Rencana Kembali (sampai)</label>
                <input type="date" value={formFilter.tgl_kembali_sampai}
                  onChange={(e) => setFormFilter({ ...formFilter, tgl_kembali_sampai: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm" />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={resetFilter}
                className="px-4 py-2 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50">
                Reset
              </button>
              <button onClick={applyFilter}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm shadow-md">
                Terapkan Filter
              </button>
            </div>
          </div>
        )}

        {/* Active Filter Badges */}
        {activeFilterCount > 0 && !showFilter && (
          <div className="flex flex-wrap gap-2 items-center text-sm">
            <span className="text-slate-500 text-xs font-medium">Filter aktif:</span>
            {appliedFilter.q && <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium">"{appliedFilter.q}"</span>}
            {appliedFilter.status && <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium capitalize">{appliedFilter.status}</span>}
            {appliedFilter.tgl_pinjam_dari && <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium">Pinjam ≥ {appliedFilter.tgl_pinjam_dari}</span>}
            {appliedFilter.tgl_pinjam_sampai && <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium">Pinjam ≤ {appliedFilter.tgl_pinjam_sampai}</span>}
            <button onClick={resetFilter} className="text-xs text-rose-600 hover:text-rose-700 font-semibold ml-2">× Clear</button>
          </div>
        )}

        {/* Tabel */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Kode</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Peminjam</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Alat</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Tgl Pinjam</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Rencana Kembali</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center">
                      <svg className="animate-spin h-8 w-8 mx-auto text-indigo-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400 text-sm">
                      <svg className="w-16 h-16 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p>Tidak ada data peminjaman</p>
                    </td>
                  </tr>
                ) : data.map(p => (
                  <tr key={p.id_pinjam} className="hover:bg-slate-50/50">
                    <td className="px-4 py-4">
                      <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">{p.kode_pinjam}</span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-slate-700">{p.user?.nama_lengkap || '-'}</p>
                      <p className="text-xs text-slate-400">@{p.user?.username || '-'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-slate-700">{p.alat?.nama_alat || '-'}</p>
                      <p className="text-xs text-slate-400 font-mono">{p.alat?.kode_alat || '-'} · x{p.jumlah}</p>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">{p.tgl_pinjam}</td>
                    <td className="px-4 py-4 text-xs text-slate-500">{p.tgl_rencana_kembali}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold capitalize ${statusBadge(p.status)}`}>
                        {p.status === 'diajukan' ? 'Menunggu' : p.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right space-x-1">
                      {p.status === 'diajukan' && (
                        <>
                          <button onClick={() => approve(p.id_pinjam, 'disetujui')}
                            className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-semibold">
                            ✓ Setujui
                          </button>
                          <button onClick={() => approve(p.id_pinjam, 'ditolak')}
                            className="px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold">
                            ✕ Tolak
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && pagination.total > 0 && (
            <div className="px-5 py-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="flex items-center gap-3 text-sm text-slate-500">
                <span>
                  Menampilkan <b className="text-slate-700">{pagination.from}</b> -{' '}
                  <b className="text-slate-700">{pagination.to}</b> dari{' '}
                  <b className="text-slate-700">{pagination.total}</b> data
                </span>
                <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
                  className="px-2 py-1 border border-slate-200 rounded-lg text-xs bg-white">
                  <option value={5}>5 / hal</option>
                  <option value={10}>10 / hal</option>
                  <option value={25}>25 / hal</option>
                  <option value={50}>50 / hal</option>
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
        </div>
      </div>
    </>
  );
}