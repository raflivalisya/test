'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. State Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // 2. State Modal Catatan & Pengiriman
  const [editingOrder, setEditingOrder] = useState(null);
  const [noteInput, setNoteInput] = useState('');
  const [deliveryStatusInput, setDeliveryStatusInput] = useState('Diproses');
  const [trackingNumberInput, setTrackingNumberInput] = useState('');

  // 3. State Modal Print Stiker
  const [printOrder, setPrintOrder] = useState(null);

  // 4. State Modal Ubah Password Admin
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const savedPass = localStorage.getItem('admin_password');
    if (savedPass) {
      setAdminPassword(savedPass);
    } else if (process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setAdminPassword(process.env.NEXT_PUBLIC_ADMIN_PASSWORD);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === adminPassword) {
      setIsAuthenticated(true);
      fetchOrders();
    } else {
      alert('Password salah!');
      setPasswordInput('');
    }
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (!newPassword.trim()) return;
    localStorage.setItem('admin_password', newPassword);
    setAdminPassword(newPassword);
    alert('Password admin berhasil diperbarui!');
    setNewPassword('');
    setShowPasswordModal(false);
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

  const toggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'lunas' ? 'pending' : 'lunas';
    await supabase.from('orders').update({ status: nextStatus }).eq('id', id);
    fetchOrders();
  };

  const handleDeleteOrder = async (id, customerName) => {
    const confirmDelete = window.confirm(`Hapus pesanan #${id} atas nama "${customerName}"?`);
    if (!confirmDelete) return;

    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) {
      alert(`Gagal menghapus: ${error.message}`);
    } else {
      fetchOrders();
    }
  };

  const openEditModal = (order) => {
    setEditingOrder(order);
    setNoteInput(order.notes || '');
    setDeliveryStatusInput(order.delivery_status || 'Diproses');
    setTrackingNumberInput(order.tracking_number || '');
  };

  const handleSaveOrderDetails = async () => {
    if (!editingOrder) return;

    const { error } = await supabase
      .from('orders')
      .update({
        notes: noteInput,
        delivery_status: deliveryStatusInput,
        tracking_number: trackingNumberInput,
      })
      .eq('id', editingOrder.id);

    if (error) {
      alert(`Gagal menyimpan: ${error.message}`);
    } else {
      setEditingOrder(null);
      fetchOrders();
    }
  };

// Tambahkan fungsi update stok di app/admin/page.js:
const handleUpdateStock = async (productId, newStock) => {
  const { error } = await supabase
    .from('products')
    .update({ stock: Number(newStock) })
    .eq('id', productId);

  if (error) {
    alert(`Gagal memperbarui stok: ${error.message}`);
  } else {
    alert('Stok berhasil diperbarui!');
  }
};
  
  // Logika Pencarian & Filter
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer_phone?.includes(searchQuery) ||
      o.id?.toString().includes(searchQuery);

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'lunas'
        ? o.status === 'lunas'
        : o.status === 'pending';

    return matchesSearch && matchesStatus;
  });

  // Perhitungan Keuangan
  const totalOmzet = orders
    .filter((o) => o.status === 'lunas')
    .reduce((sum, o) => sum + Number(o.total_price), 0);

  const totalPending = orders
    .filter((o) => o.status === 'pending')
    .reduce((sum, o) => sum + Number(o.total_price), 0);

  const countLunas = orders.filter((o) => o.status === 'lunas').length;

  const exportToCSV = () => {
    if (filteredOrders.length === 0) {
      alert('Tidak ada data untuk diekspor!');
      return;
    }

    const headers = ['ID,Tanggal,Nama Pelanggan,No WA,Pesanan,Total Harga,Status Bayar,Status Kirim,No Resi,Catatan'];
    const rows = filteredOrders.map((o) =>
      [
        o.id,
        `"${new Date(o.created_at).toLocaleString('id-ID')}"`,
        `"${o.customer_name}"`,
        `"${o.customer_phone}"`,
        `"${o.items}"`,
        o.total_price,
        o.status,
        `"${o.delivery_status || 'Diproses'}"`,
        `"${o.tracking_number || '-'}"`,
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

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-900">Login Admin</h1>
            <p className="mt-1 text-xs text-slate-500">Masukkan password untuk mengelola parcel.</p>
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

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800 sm:p-10">
      <div className="mx-auto max-w-7xl">
        {/* Header Dashboard */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Dashboard Admin Parcel</h1>
            <p className="mt-1 text-sm text-slate-500">Kelola keuangan, pengiriman resi, cetak label, dan status pesanan.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              🔑 Ubah Password
            </button>
            <button
              onClick={exportToCSV}
              className="rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800"
            >
              📊 Ekspor CSV
            </button>
            <button
              onClick={fetchOrders}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-200"
            >
              🚪 Keluar
            </button>
          </div>
        </div>

        {/* Ringkasan Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Omzet (Lunas)</p>
            <p className="mt-2 text-2xl font-black text-emerald-700">Rp {totalOmzet.toLocaleString('id-ID')}</p>
            <p className="mt-1 text-xs text-slate-500">{countLunas} pesanan selesai</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Potensi Pending</p>
            <p className="mt-2 text-2xl font-black text-amber-500">Rp {totalPending.toLocaleString('id-ID')}</p>
            <p className="mt-1 text-xs text-slate-500">{orders.length - countLunas} belum lunas</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Pesanan</p>
            <p className="mt-2 text-2xl font-black text-slate-800">{orders.length}</p>
            <p className="mt-1 text-xs text-slate-500">Semua riwayat masuk</p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <input
              type="text"
              placeholder="Cari nama, WA, atau ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20 sm:w-72"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Filter Status:</span>
            <button
              onClick={() => setStatusFilter('all')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({orders.length})
            </button>
            <button
              onClick={() => setStatusFilter('lunas')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === 'lunas' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Lunas ({countLunas})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                statusFilter === 'pending' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pending ({orders.length - countLunas})
            </button>
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
                  <th className="px-5 py-4">Pengiriman</th>
                  <th className="px-5 py-4">Bayar</th>
                  <th className="px-5 py-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-slate-400">
                      Memuat data...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-slate-400">
                      Tidak ada data pesanan yang cocok.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((item) => {
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

                        {/* Status Pengiriman & Resi */}
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1">
                            <span className="inline-block rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-800 border border-blue-200 w-fit">
                              🚚 {item.delivery_status || 'Diproses'}
                            </span>
                            {item.tracking_number && (
                              <span className="text-[11px] font-mono text-slate-500">
                                Resi: {item.tracking_number}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status Pembayaran */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                              isLunas ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.status.toUpperCase()}
                          </span>
                        </td>

                        {/* Tombol-Tombol Aksi */}
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => toggleStatus(item.id, item.status)}
                              title="Ubah Status Bayar"
                              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                                isLunas
                                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  : 'bg-emerald-700 text-white hover:bg-emerald-800'
                              }`}
                            >
                              {isLunas ? 'Pending' : 'Lunas'}
                            </button>

                            <button
                              onClick={() => openEditModal(item)}
                              title="Edit Catatan & Resi"
                              className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 border border-blue-200"
                            >
                              📝 Resi & Note
                            </button>

                            <button
                              onClick={() => setPrintOrder(item)}
                              title="Cetak Label Pengiriman"
                              className="rounded-lg bg-purple-50 px-2.5 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 border border-purple-200"
                            >
                              🖨️ Cetak
                            </button>

                            <button
                              onClick={() => handleDeleteOrder(item.id, item.customer_name)}
                              title="Hapus Pesanan"
                              className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 border border-rose-200"
                            >
                              🗑️
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

        {/* Modal 1: Edit Resi, Status Kirim & Catatan */}
        {editingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Kelola Order #{editingOrder.id}</h3>

              <div>
                <label className="block text-xs font-bold text-slate-700">Status Pengiriman</label>
                <select
                  value={deliveryStatusInput}
                  onChange={(e) => setDeliveryStatusInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                >
                  <option value="Diproses">Diproses / Packing</option>
                  <option value="Dikirim">Dalam Pengiriman (Kurir)</option>
                  <option value="Selesai">Tiba di Tujuan / Selesai</option>
                  <option value="Dibatalkan">Dibatalkan</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Nomor Resi / Nama Kurir</label>
                <input
                  type="text"
                  placeholder="Contoh: JNE-988234 / GrabExpress (Budi)"
                  value={trackingNumberInput}
                  onChange={(e) => setTrackingNumberInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Catatan Internal Admin</label>
                <textarea
                  rows="3"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Instruksi tambahan, warna pita, dsb."
                  className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditingOrder(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveOrderDetails}
                  className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                >
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal 2: Cetak Label Stiker Pengiriman */}
        {printOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-4 border-b pb-3 print:hidden">
                <h3 className="text-lg font-bold text-slate-900">Preview Stiker Pengiriman</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => window.print()}
                    className="rounded-xl bg-purple-700 px-4 py-2 text-xs font-bold text-white hover:bg-purple-800"
                  >
                    🖨️ Cetak / Print
                  </button>
                  <button
                    onClick={() => setPrintOrder(null)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Tutup
                  </button>
                </div>
              </div>

              {/* Area Stiker Pengiriman Siap Print */}
              <div className="rounded-2xl border-2 border-dashed border-slate-300 p-6 bg-amber-50/40 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-300 pb-3">
                  <div>
                    <h2 className="text-xl font-black text-emerald-800">PARCEL STORE</h2>
                    <p className="text-[10px] text-slate-500">Label Pengiriman Parcel & Hampers</p>
                  </div>
                  <span className="font-mono text-sm font-bold text-slate-800">#{printOrder.id}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Penerima / Pemesan:</p>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">{printOrder.customer_name}</p>
                    <p className="text-slate-600 mt-0.5">{printOrder.customer_phone}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Detail Parcel:</p>
                    <p className="font-semibold text-slate-800 mt-0.5">{printOrder.items}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-white p-3 text-xs">
                  <p className="text-[10px] font-bold text-amber-800 uppercase">Pesan / Ucapan Kartu:</p>
                  <p className="italic text-slate-700 mt-1">"{printOrder.notes || 'Selamat Hari Raya, Semoga Berkah selalu!'}"</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal 3: Pengubah Password Admin */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Ubah Password Admin</h3>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700">Password Baru</label>
                  <input
                    type="password"
                    required
                    placeholder="Masukkan password baru..."
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800"
                  >
                    Simpan Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
