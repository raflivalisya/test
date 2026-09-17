'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // State untuk Modal Catatan
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteInput, setNoteInput] = useState('');

  const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      fetchOrders();
    } else {
      alert('Password salah!');
      setPasswordInput('');
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      alert(`Gagal mengambil data: ${error.message}`);
    } else if (data) {
      setOrders(data);
    }
    setLoading(false);
  };

  // Toggle Status Lunas / Pending
  const toggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'lunas' ? 'pending' : 'lunas';
    await supabase.from('orders').update({ status: nextStatus }).eq('id', id);
    fetchOrders();
  };

  // 1. Fitur Hapus Pesanan
  const handleDeleteOrder = async (id, customerName) => {
    const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus pesanan #${id} atas nama "${customerName}"?`);
    if (!confirmDelete) return;

    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) {
      alert(`Gagal menghapus pesanan: ${error.message}`);
    } else {
      alert(`Pesanan #${id} berhasil dihapus.`);
      fetchOrders();
    }
  };

  // 2. Fitur Simpan Catatan
  const openNoteModal = (order) => {
    setEditingNoteId(order.id);
    setNoteInput(order.notes || '');
  };

  const handleSaveNote = async () => {
    if (!editingNoteId) return;

    const { error } = await supabase
      .from('orders')
      .update({ notes: noteInput })
      .eq('id', editingNoteId);

    if (error) {
      alert(`Gagal menyimpan catatan: ${error.message}`);
    } else {
      setEditingNoteId(null);
      setNoteInput('');
      fetchOrders();
    }
  };

  // Perhitungan Keuangan
  const totalOmzet = orders
    .filter((o) => o.status === 'lunas')
    .reduce((sum, o) => sum + Number(o.total_price), 0);

  const totalPending = orders
    .filter((o) => o.status === 'pending')
    .reduce((sum, o) => sum + Number(o.total_price), 0);

  const countLunas = orders.filter((o) => o.status === 'lunas').length;

  // Ekspor CSV (termasuk kolom Catatan)
  const exportToCSV = () => {
    if (orders.length === 0) {
      alert('Tidak ada data untuk diekspor!');
      return;
    }

    const headers = ['ID,Tanggal,Nama Pelanggan,No WA,Pesanan,Total Harga,Status,Catatan Admin'];
    const rows = orders.map((o) =>
      [
        o.id,
        `"${new Date(o.created_at).toLocaleString('id-ID')}"`,
        `"${o.customer_name}"`,
        `"${o.customer_phone}"`,
        `"${o.items}"`,
        o.total_price,
        o.status,
        `"${o.notes || ''}"`,
      ].join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `laporan-parcel-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Form Login
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-900">Login Admin</h1>
            <p className="mt-1 text-xs text-slate-500">Masukkan password untuk mengelola parcel & pesanan.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Password</label>
              <input
                type="password"
                required
                placeholder="Masukkan password..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800"
            >
              Masuk Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Tampilan Dashboard Utama
  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800 sm:p-10">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Dashboard Admin Parcel</h1>
            <p className="mt-1 text-sm text-slate-500">Kelola status pembayaran, berikan catatan khusus, dan hapus transaksi.</p>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
            >
              📊 Ekspor CSV
            </button>
            <button
              onClick={fetchOrders}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-200"
            >
              🚪 Keluar
            </button>
          </div>
        </div>

        {/* Ringkasan Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Omzet (Lunas)</p>
            <p className="mt-2 text-2xl font-black text-emerald-700">
              Rp {totalOmzet.toLocaleString('id-ID')}
            </p>
            <p className="mt-1 text-xs text-slate-500">{countLunas} pesanan selesai</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Potensi Pending</p>
            <p className="mt-2 text-2xl font-black text-amber-500">
              Rp {totalPending.toLocaleString('id-ID')}
            </p>
            <p className="mt-1 text-xs text-slate-500">{orders.length - countLunas} belum lunas</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Pesanan</p>
            <p className="mt-2 text-2xl font-black text-slate-800">{orders.length}</p>
            <p className="mt-1 text-xs text-slate-500">Semua riwayat masuk</p>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-4">ID</th>
                  <th className="px-5 py-4">Tanggal</th>
                  <th className="px-5 py-4">Pelanggan</th>
                  <th className="px-5 py-4">Pesanan / Detail</th>
                  <th className="px-5 py-4">Total</th>
                  <th className="px-5 py-4">Catatan Admin</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-slate-400">
                      Memuat data pesanan...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-slate-400">
                      Belum ada transaksi parcel.
                    </td>
                  </tr>
                ) : (
                  orders.map((item) => {
                    const isLunas = item.status === 'lunas';
                    return (
                      <tr key={item.id} className="transition hover:bg-slate-50/60">
                        <td className="px-5 py-4 font-mono font-bold text-slate-900">#{item.id}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">
                          {new Date(item.created_at).toLocaleString('id-ID')}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">{item.customer_name}</div>
                          <div className="text-xs text-slate-400">{item.customer_phone}</div>
                        </td>
                        <td className="px-5 py-4 max-w-xs text-xs font-medium text-slate-700 leading-relaxed">
                          {item.items}
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-900 whitespace-nowrap">
                          Rp {Number(item.total_price).toLocaleString('id-ID')}
                        </td>

                        {/* Tampilan Catatan Admin */}
                        <td className="px-5 py-4 max-w-xs">
                          {item.notes ? (
                            <div className="rounded-lg bg-amber-50 p-2 text-xs border border-amber-200 text-amber-900">
                              💬 {item.notes}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300 italic">Belum ada catatan</span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                              isLunas ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.status.toUpperCase()}
                          </span>
                        </td>

                        {/* Aksi: Status, Catatan, dan Hapus */}
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Tombol Status */}
                            <button
                              onClick={() => toggleStatus(item.id, item.status)}
                              title="Ubah Status"
                              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                                isLunas
                                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  : 'bg-emerald-700 text-white hover:bg-emerald-800'
                              }`}
                            >
                              {isLunas ? 'Pending' : 'Lunas'}
                            </button>

                            {/* Tombol Catatan */}
                            <button
                              onClick={() => openNoteModal(item)}
                              title="Edit Catatan"
                              className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition border border-blue-200"
                            >
                              📝 Note
                            </button>

                            {/* Tombol Hapus */}
                            <button
                              onClick={() => handleDeleteOrder(item.id, item.customer_name)}
                              title="Hapus Pesanan"
                              className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition border border-rose-200"
                            >
                              🗑️ Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Pop-up Input / Edit Catatan */}
        {editingNoteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="text-lg font-bold text-slate-900">Catatan Admin (Order #{editingNoteId})</h3>
              <p className="mt-1 text-xs text-slate-500">
                Tambahkan catatan internal seperti resi pengiriman, alamat khusus, atau instruksi kurir.
              </p>

              <textarea
                rows="4"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Contoh: Sudah dikirim via GrabExpress (Resi: 12345). Kartu ucapan warna pita merah."
                className="mt-4 w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              ></textarea>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setEditingNoteId(null);
                    setNoteInput('');
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveNote}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800 shadow"
                >
                  Simpan Catatan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
