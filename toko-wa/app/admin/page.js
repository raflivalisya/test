'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [newPassword, setNewPassword] = useState('');

  // Active Tab: 'orders' | 'products' | 'finance' | 'settings'
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals / Form State
  const [editingOrder, setEditingOrder] = useState(null);
  const [noteInput, setNoteInput] = useState('');
  const [invoiceOrder, setInvoiceOrder] = useState(null);

  // Form Tambah / Edit Produk
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', price: '', cost_price: '', stock: '', description: '', image_url: '' });

  useEffect(() => {
    const savedPass = localStorage.getItem('admin_password');
    if (savedPass) setAdminPassword(savedPass);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === adminPassword) {
      setIsAuthenticated(true);
      fetchOrders();
      fetchProducts();
    } else {
      alert('Password salah!');
    }
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    if (!newPassword) return;
    localStorage.setItem('admin_password', newPassword);
    setAdminPassword(newPassword);
    setNewPassword('');
    alert('Password berhasil diperbarui!');
  };

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (data) setOrders(data);
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').order('id', { ascending: true });
    if (data) setProducts(data);
  };

  // WhatsApp Direct Link
  const sendWhatsApp = (item) => {
    let phone = item.customer_phone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.slice(1);

    const message = `Halo Kak *${item.customer_name}*,\n\nTerima kasih telah memesan di Parcel Store!\n\n📌 *Detail Pesanan #${item.id}*:\n- Items: ${item.items}\n- Total: Rp ${Number(item.total_price).toLocaleString('id-ID')}\n- Status: *${item.status.toUpperCase()}*\n\nAnda dapat melacak status pesanan secara mandiri melalui link berikut:\nhttps://website-anda.com/track?id=${item.id}\n\nAda yang bisa kami bantu kembali? 😊`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Update Status Pesanan
  const handleStatusChange = async (id, newStatus) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', id);
    fetchOrders();
  };

  // Update Catatan Khusus
  const handleSaveNote = async () => {
    if (!editingOrder) return;
    await supabase.from('orders').update({ notes: noteInput }).eq('id', editingOrder.id);
    setEditingOrder(null);
    fetchOrders();
  };

  // CRUD Produk
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (editingProduct) {
      await supabase.from('products').update(productForm).eq('id', editingProduct.id);
    } else {
      await supabase.from('products').insert([productForm]);
    }
    setProductForm({ name: '', price: '', cost_price: '', stock: '', description: '', image_url: '' });
    setEditingProduct(null);
    fetchProducts();
  };

  const handleDeleteProduct = async (id) => {
    if (confirm('Yakin ingin menghapus produk ini?')) {
      await supabase.from('products').delete().eq('id', id);
      fetchProducts();
    }
  };

  // Filter Pesanan
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customer_phone?.includes(searchQuery) ||
      o.id?.toString().includes(searchQuery);

    const matchesStatus =
      statusFilter === 'all' ? true : statusFilter === 'lunas' ? o.status === 'lunas' : o.status === 'pending';

    const orderDate = o.created_at ? o.created_at.split('T')[0] : '';
    const matchesStartDate = startDate ? orderDate >= startDate : true;
    const matchesEndDate = endDate ? orderDate <= endDate : true;

    return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate;
  });

  // ==========================================
  // KALKULASI KEUANGAN & ANALITIK TINGKAT LANJUT
  // ==========================================
  const completedOrders = filteredOrders.filter((o) => o.status === 'lunas');
  const pendingOrders = filteredOrders.filter((o) => o.status === 'pending');

  const totalRevenue = completedOrders.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
  const pendingRevenue = pendingOrders.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
  const avgOrderValue = completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length) : 0;

  // HPP / Modal & Laba Bersih (Estimasi 65% HPP jika cost_price tidak ditentukan)
  const totalCost = completedOrders.reduce((sum, item) => sum + Number(item.cost_price || item.total_price * 0.65), 0);
  const netProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

  // Breakdown Metode Pembayaran
  const paymentMethods = completedOrders.reduce((acc, order) => {
    const method = order.payment_method || 'Transfer Bank / QRIS';
    acc[method] = (acc[method] || 0) + Number(order.total_price || 0);
    return acc;
  }, {});

  // Top Items / Products Analytics
  const itemAnalytics = completedOrders.reduce((acc, order) => {
    const itemName = order.items || 'Parcel Custom';
    if (!acc[itemName]) {
      acc[itemName] = { count: 0, revenue: 0 };
    }
    acc[itemName].count += 1;
    acc[itemName].revenue += Number(order.total_price || 0);
    return acc;
  }, {});

  const sortedTopItems = Object.entries(itemAnalytics).sort((a, b) => b[1].revenue - a[1].revenue);

  // Rekapitulasi Harian
  const dailySummary = filteredOrders.reduce((acc, order) => {
    const date = order.created_at ? order.created_at.split('T')[0] : 'Lainnya';
    if (!acc[date]) {
      acc[date] = { count: 0, lunas: 0, pending: 0, total: 0 };
    }
    acc[date].count += 1;
    if (order.status === 'lunas') {
      acc[date].lunas += Number(order.total_price || 0);
    } else {
      acc[date].pending += Number(order.total_price || 0);
    }
    acc[date].total += Number(order.total_price || 0);
    return acc;
  }, {});

  // Export Keuangan Ke CSV
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return alert('Tidak ada data untuk diekspor!');

    let csvContent = 'data:text/csv;charset=utf-8,ID,Tanggal,Nama Pelanggan,No WA,Items,Total Harga,Status,Metode Pembayaran\n';
    filteredOrders.forEach((o) => {
      const row = [
        o.id,
        o.created_at ? o.created_at.split('T')[0] : '',
        `"${o.customer_name || ''}"`,
        `"${o.customer_phone || ''}"`,
        `"${o.items || ''}"`,
        o.total_price || 0,
        o.status,
        `"${o.payment_method || 'QRIS/Transfer'}"`
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Keuangan_Parcel_${startDate || 'all'}_s.d_${endDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-2xl border bg-white p-6 shadow-xl space-y-4">
          <h1 className="text-xl font-bold text-slate-900 text-center">Login Admin</h1>
          <input
            type="password"
            placeholder="Password admin..."
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            className="w-full rounded-xl border p-2.5 text-sm"
          />
          <button type="submit" className="w-full rounded-xl bg-emerald-700 py-2.5 font-bold text-white">
            Masuk
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800">
      <div className="mx-auto max-w-7xl">
        {/* Header Dashboard */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard Admin Parcel</h1>
            <p className="text-xs text-slate-500">Kelola pesanan, stok produk, analitik keuangan, dan layanan pelanggan.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('orders')}
              className={`rounded-xl px-4 py-2 text-xs font-bold ${
                activeTab === 'orders' ? 'bg-emerald-700 text-white' : 'bg-white border text-slate-700'
              }`}
            >
              📦 Pesanan
            </button>
            <button
              onClick={() => setActiveTab('finance')}
              className={`rounded-xl px-4 py-2 text-xs font-bold ${
                activeTab === 'finance' ? 'bg-emerald-700 text-white' : 'bg-white border text-slate-700'
              }`}
            >
              📊 Keuangan & Analitik
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`rounded-xl px-4 py-2 text-xs font-bold ${
                activeTab === 'products' ? 'bg-emerald-700 text-white' : 'bg-white border text-slate-700'
              }`}
            >
              🎁 Stok Produk
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`rounded-xl px-4 py-2 text-xs font-bold ${
                activeTab === 'settings' ? 'bg-emerald-700 text-white' : 'bg-white border text-slate-700'
              }`}
            >
              ⚙️ Pengaturan
            </button>
            <button onClick={() => setIsAuthenticated(false)} className="rounded-xl border bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100">
              🚪 Keluar
            </button>
          </div>
        </div>

        {/* TAB 1: MANAJEMEN PESANAN */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-5 items-end">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Cari Pesanan</label>
                <input
                  type="text"
                  placeholder="Nama, WA, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-xl border p-2 text-xs"
                >
                  <option value="all">Semua Status</option>
                  <option value="pending">Pending</option>
                  <option value="lunas">Lunas</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Dari Tanggal</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border p-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border p-2 text-xs"
                />
              </div>
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="rounded-xl bg-slate-100 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                Reset Filter
              </button>
            </div>

            {/* Tabel Pesanan */}
            <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b">
                  <tr>
                    <th className="p-4">ID / Tanggal</th>
                    <th className="p-4">Pelanggan</th>
                    <th className="p-4">Detail Items</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Catatan</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredOrders.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-4 font-mono font-bold">
                        #{item.id}
                        <div className="text-[10px] font-normal text-slate-400">
                          {item.created_at ? item.created_at.split('T')[0] : '-'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-slate-900">{item.customer_name}</div>
                        <div className="text-xs text-slate-400">{item.customer_phone}</div>
                      </td>
                      <td className="p-4 text-xs">{item.items}</td>
                      <td className="p-4 font-bold">Rp {Number(item.total_price).toLocaleString('id-ID')}</td>
                      <td className="p-4 text-xs italic text-slate-500">
                        {item.notes || '-'}
                        <button
                          onClick={() => {
                            setEditingOrder(item);
                            setNoteInput(item.notes || '');
                          }}
                          className="ml-2 text-[10px] text-emerald-700 underline font-bold"
                        >
                          Edit
                        </button>
                      </td>
                      <td className="p-4">
                        <select
                          value={item.status}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          className={`rounded-lg px-2 py-1 text-xs font-bold ${
                            item.status === 'lunas' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          <option value="pending">PENDING</option>
                          <option value="lunas">LUNAS</option>
                        </select>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => sendWhatsApp(item)}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs text-white font-bold hover:bg-emerald-700"
                            title="Kirim Pesan WA"
                          >
                            📱 WA
                          </button>
                          <button
                            onClick={() => setInvoiceOrder(item)}
                            className="rounded-lg bg-purple-50 px-2.5 py-1.5 text-xs font-bold text-purple-700 border hover:bg-purple-100"
                          >
                            🧾 Invoice
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: KEUANGAN & ANALITIK TINGKAT LANJUT */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            {/* Filter Periode & Export Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border bg-white p-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Analitik Keuangan & Penjualan</h2>
                <p className="text-xs text-slate-500">Data berikut diperbarui sesuai rentang tanggal terpilih.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl border p-2 text-xs"
                />
                <span className="text-xs font-bold text-slate-400">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-xl border p-2 text-xs"
                />
                <button
                  onClick={handleExportCSV}
                  className="rounded-xl bg-emerald-800 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-900"
                >
                  📥 Export CSV / Excel
                </button>
              </div>
            </div>

            {/* Top Metric Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-1">
                <p className="text-xs font-bold uppercase text-slate-400">Total Omset (Lunas)</p>
                <p className="text-2xl font-black text-emerald-700">Rp {totalRevenue.toLocaleString('id-ID')}</p>
                <p className="text-[10px] text-slate-400">{completedOrders.length} transaksi terbayar</p>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-1">
                <p className="text-xs font-bold uppercase text-slate-400">Keuntungan Bersih (Profit)</p>
                <p className="text-2xl font-black text-blue-700">Rp {netProfit.toLocaleString('id-ID')}</p>
                <p className="text-[10px] text-slate-400">Margin Profit: <strong className="text-blue-800">{profitMargin}%</strong></p>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-1">
                <p className="text-xs font-bold uppercase text-slate-400">Piutang Pending</p>
                <p className="text-2xl font-black text-amber-600">Rp {pendingRevenue.toLocaleString('id-ID')}</p>
                <p className="text-[10px] text-slate-400">{pendingOrders.length} pesanan menanti pembayaran</p>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-1">
                <p className="text-xs font-bold uppercase text-slate-400">Rata-rata Order (AOV)</p>
                <p className="text-2xl font-black text-indigo-700">Rp {avgOrderValue.toLocaleString('id-ID')}</p>
                <p className="text-[10px] text-slate-400">Nilai rata-rata per transaksi</p>
              </div>
            </div>

            {/* Grid Analitik 2 Kolom: Produk Terlaris & Metode Pembayaran */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Box 1: Produk Terlaris */}
              <div className="rounded-2xl border bg-white p-5 space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                  <span>🔥 Produk / Parcel Terlaris</span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Berdasarkan Omset</span>
                </h3>
                <div className="space-y-3">
                  {sortedTopItems.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Belum ada data penjualan lunas.</p>
                  ) : (
                    sortedTopItems.slice(0, 5).map(([name, data], idx) => (
                      <div key={idx} className="flex items-center justify-between border-b pb-2 text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{name}</p>
                          <p className="text-[10px] text-slate-400">{data.count}x Dipesan</p>
                        </div>
                        <p className="font-black text-emerald-700">Rp {data.revenue.toLocaleString('id-ID')}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Box 2: Metode Pembayaran */}
              <div className="rounded-2xl border bg-white p-5 space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
                  <span>💳 Metode Pembayaran Digunakan</span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Total Masuk</span>
                </h3>
                <div className="space-y-3">
                  {Object.keys(paymentMethods).length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Belum ada pembayaran lunas.</p>
                  ) : (
                    Object.entries(paymentMethods).map(([method, total], idx) => {
                      const percent = totalRevenue > 0 ? ((total / totalRevenue) * 100).toFixed(0) : 0;
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold">
                            <span>{method}</span>
                            <span>Rp {total.toLocaleString('id-ID')} ({percent}%)</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${percent}%` }}></div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Table Breakdown Rekapitulasi Harian */}
            <div className="rounded-2xl border bg-white p-5 space-y-4 shadow-sm">
              <h3 className="font-bold text-slate-900 text-sm">📅 Rekap Penjualan Harian</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 uppercase text-slate-400 border-b">
                    <tr>
                      <th className="p-3">Tanggal</th>
                      <th className="p-3">Total Pesanan</th>
                      <th className="p-3">Pendapatan Lunas</th>
                      <th className="p-3">Potensi Pending</th>
                      <th className="p-3 text-right">Total Transaksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {Object.keys(dailySummary).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400">Tidak ada data untuk periode ini.</td>
                      </tr>
                    ) : (
                      Object.entries(dailySummary).map(([date, stat]) => (
                        <tr key={date} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-slate-700">{date}</td>
                          <td className="p-3">{stat.count} Pesanan</td>
                          <td className="p-3 font-bold text-emerald-700">Rp {stat.lunas.toLocaleString('id-ID')}</td>
                          <td className="p-3 text-amber-600 font-semibold">Rp {stat.pending.toLocaleString('id-ID')}</td>
                          <td className="p-3 text-right font-black text-slate-900">Rp {stat.total.toLocaleString('id-ID')}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MANAJEMEN STOK PRODUK / PARCEL */}
        {activeTab === 'products' && (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Form Tambah/Edit Produk */}
            <div className="rounded-2xl border bg-white p-5 space-y-4">
              <h2 className="text-base font-bold text-slate-900">
                {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
              </h2>
              <form onSubmit={handleSaveProduct} className="space-y-3">
                <input
                  type="text"
                  placeholder="Nama Parcel..."
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full rounded-xl border p-2 text-xs"
                  required
                />
                <input
                  type="number"
                  placeholder="Harga Jual (Rp)..."
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  className="w-full rounded-xl border p-2 text-xs"
                  required
                />
                <input
                  type="number"
                  placeholder="Harga Modal / HPP (Rp)..."
                  value={productForm.cost_price}
                  onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
                  className="w-full rounded-xl border p-2 text-xs"
                />
                <input
                  type="number"
                  placeholder="Stok Tersedia..."
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  className="w-full rounded-xl border p-2 text-xs"
                  required
                />
                <textarea
                  placeholder="Deskripsi Isi Parcel..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full rounded-xl border p-2 text-xs"
                  rows={3}
                />
                <input
                  type="text"
                  placeholder="URL Gambar..."
                  value={productForm.image_url}
                  onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                  className="w-full rounded-xl border p-2 text-xs"
                />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 rounded-xl bg-emerald-700 py-2 text-xs font-bold text-white">
                    Simpan Produk
                  </button>
                  {editingProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProduct(null);
                        setProductForm({ name: '', price: '', cost_price: '', stock: '', description: '', image_url: '' });
                      }}
                      className="rounded-xl border px-3 text-xs font-bold"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Daftar Produk */}
            <div className="md:col-span-2 overflow-hidden rounded-2xl border bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b">
                  <tr>
                    <th className="p-4">Produk</th>
                    <th className="p-4">Harga Jual</th>
                    <th className="p-4">Harga Modal</th>
                    <th className="p-4">Stok</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td className="p-4 font-semibold text-slate-900">{p.name}</td>
                      <td className="p-4 font-bold text-emerald-700">Rp {Number(p.price).toLocaleString('id-ID')}</td>
                      <td className="p-4 text-slate-500">
                        {p.cost_price ? `Rp ${Number(p.cost_price).toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="p-4 font-bold">{p.stock} pcs</td>
                      <td className="p-4 text-center space-x-2">
                        <button
                          onClick={() => {
                            setEditingProduct(p);
                            setProductForm(p);
                          }}
                          className="text-xs font-bold text-emerald-700 underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="text-xs font-bold text-rose-600 underline"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: PENGATURAN PASSWORD */}
        {activeTab === 'settings' && (
          <div className="max-w-md rounded-2xl border bg-white p-6 space-y-4">
            <h2 className="text-lg font-bold text-slate-900">Ganti Password Admin</h2>
            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <input
                type="password"
                placeholder="Password baru..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border p-2.5 text-sm"
                required
              />
              <button type="submit" className="w-full rounded-xl bg-emerald-700 py-2.5 text-xs font-bold text-white">
                Update Password
              </button>
            </form>
          </div>
        )}

        {/* Modal Edit Note */}
        {editingOrder && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 space-y-4">
              <h3 className="font-bold">Edit Catatan Pesanan #{editingOrder.id}</h3>
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                className="w-full rounded-xl border p-3 text-xs"
                rows={4}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditingOrder(null)} className="rounded-xl border px-4 py-2 text-xs font-bold">
                  Batal
                </button>
                <button onClick={handleSaveNote} className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white">
                  Simpan Catatan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Printable Invoice */}
        {invoiceOrder && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4 z-50">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 space-y-4 shadow-2xl">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-black text-emerald-800">INVOICE PEMESANAN</h2>
                <p className="text-xs text-slate-500">PARCEL STORE - #{invoiceOrder.id}</p>
              </div>
              <div className="space-y-2 text-xs">
                <p><strong>Nama:</strong> {invoiceOrder.customer_name}</p>
                <p><strong>No. WhatsApp:</strong> {invoiceOrder.customer_phone}</p>
                <p><strong>Rincian Pesanan:</strong> {invoiceOrder.items}</p>
                <p><strong>Total Pembayaran:</strong> Rp {Number(invoiceOrder.total_price).toLocaleString('id-ID')}</p>
                <p><strong>Status:</strong> {invoiceOrder.status.toUpperCase()}</p>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button onClick={() => setInvoiceOrder(null)} className="rounded-xl border px-4 py-2 text-xs font-bold">
                  Tutup
                </button>
                <button onClick={() => window.print()} className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white">
                  🖨️ Cetak Invoice
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
