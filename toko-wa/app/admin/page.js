'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Ganti "admin123" dengan password pilihanmu, atau ambil dari .env.local
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
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setOrders(data);
    setLoading(false);
  };

  const toggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'lunas' ? 'pending' : 'lunas';
    await supabase.from('orders').update({ status: nextStatus }).eq('id', id);
    fetchOrders();
  };

  // Perhitungan Keuangan
  const totalOmzet = orders
    .filter((o) => o.status === 'lunas')
    .reduce((sum, o) => sum + Number(o.total_price), 0);

  const totalPending = orders
    .filter((o) => o.status === 'pending')
    .reduce((sum, o) => sum + Number(o.total_price), 0);

  const countLunas = orders.filter((o) => o.status === 'lunas').length;

  // Fungsi Ekspor ke CSV
  const exportToCSV = () => {
    if (orders.length === 0) {
      alert('Tidak ada data untuk diekspor!');
      return;
    }

    const headers = ['ID,Tanggal,Nama Pelanggan,No WA,Pesanan,Total Harga,Status'];
    const rows = orders.map((o) =>
      [
        o.id,
        `"${new Date(o.created_at).toLocaleString('id-ID')}"`,
        `"${o.customer_name}"`,
        `"${o.customer_phone}"`,
        `"${o.items}"`,
        o.total_price,
        o.status,
      ].join(',')
    );

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `laporan-penjualan-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Tampilan Form Login jika belum terautentikasi
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-900">Login Admin</h1>
            <p className="mt-1 text-xs text-slate-500">Masukkan password untuk mengakses dashboard.</p>
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
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              Masuk Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Tampilan Dashboard setelah berhasil Login
  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800 sm:p-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Dashboard Admin</h1>
            <p className="mt-1 text-sm text-slate-500">Pantau keuangan dan kelola data pesanan toko.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              📊 Ekspor CSV
            </button>
            <button
              onClick={fetchOrders}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-200"
            >
              🚪 Keluar
            </button>
          </div>
        </div>

        {/* Ringkasan Keuangan (Cards) */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Omzet (Lunas)</p>
            <p className="mt-2 text-2xl font-black text-emerald-600">
              Rp {totalOmzet.toLocaleString('id-ID')}
            </p>
            <p className="mt-1 text-xs text-slate-500">{countLunas} transaksi selesai</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Potensi Pending</p>
            <p className="mt-2 text-2xl font-black text-amber-500">
              Rp {totalPending.toLocaleString('id-ID')}
            </p>
            <p className="mt-1 text-xs text-slate-500">{orders.length - countLunas} belum dibayar</p>
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
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Pelanggan</th>
                  <th className="px-6 py-4">Pesanan</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-slate-400">
                      Memuat data...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-slate-400">
                      Belum ada transaksi.
                    </td>
                  </tr>
                ) : (
                  orders.map((item) => {
                    const isLunas = item.status === 'lunas';
                    return (
                      <tr key={item.id} className="transition hover:bg-slate-50/50">
                        <td className="px-6 py-4 font-mono font-semibold text-slate-900">#{item.id}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-xs text-slate-500">
                          {new Date(item.created_at).toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900">{item.customer_name}</div>
                          <div className="text-xs text-slate-400">{item.customer_phone}</div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-700">{item.items}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">
                          Rp {Number(item.total_price).toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                              isLunas ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => toggleStatus(item.id, item.status)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                              isLunas
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                          >
                            {isLunas ? 'Tandai Pending' : 'Tandai Lunas'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}