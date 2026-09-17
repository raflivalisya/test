'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [newPassword, setNewPassword] = useState('');

  // Active Tab: 'orders' | 'finance' | 'products' | 'settings'
  const [activeTab, setActiveTab] = useState('finance');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Rincian Beban Operasional (OPEX) Untuk Keuangan Profesional
  const [opex, setOpex] = useState({
    packaging: 0,
    marketing: 0,
    operational: 0,
    shipping: 0
  });

  // State Modals / Form
  const [editingOrder, setEditingOrder] = useState(null);
  const [noteInput, setNoteInput] = useState('');
  const [invoiceOrder, setInvoiceOrder] = useState(null);

  // Form Tambah / Edit Produk
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({ name: '', price: '', cost_price: '', stock: '', description: '', image_url: '' });

  useEffect(() => {
    const savedPass = localStorage.getItem('admin_password');
    if (savedPass) setAdminPassword(savedPass);

    const savedOpex = localStorage.getItem('financial_opex');
    if (savedOpex) {
      try {
        setOpex(JSON.parse(savedOpex));
      } catch (e) {
        console.error(e);
      }
    }
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
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (!error && data) setOrders(data);
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

    const message = `Halo Kak *${item.customer_name}*,\n\nTerima kasih telah memesan di Parcel Store!\n\n📌 *Detail Pesanan #${item.id}*:\n- Items: ${item.items}\n- Total: Rp ${Number(item.total_price).toLocaleString('id-ID')}\n- Metode Bayar: *${item.payment_method || 'Transfer Bank'}*\n- Status: *${item.status.toUpperCase()}*\n\nAda yang bisa kami bantu? 😊`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Update Status Pesanan ke Supabase
  const handleStatusChange = async (id, newStatus) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
    if (!error) {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)));
    } else {
      alert('Gagal memperbarui status: ' + error.message);
    }
  };

  // FIX: PERBAIKAN CARA BAYAR (UPDATES SUPABASE & STATE INTERAKTIF)
  const handlePaymentMethodChange = async (id, newMethod) => {
    const { error } = await supabase.from('orders').update({ payment_method: newMethod }).eq('id', id);
    if (!error) {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, payment_method: newMethod } : o)));
    } else {
      alert('Gagal memperbarui cara bayar: ' + error.message);
    }
  };

  // Update Catatan
  const handleSaveNote = async () => {
    if (!editingOrder) return;
    await supabase.from('orders').update({ notes: noteInput }).eq('id', editingOrder.id);
    setEditingOrder(null);
    fetchOrders();
  };

  // Update OPEX Keuangan
  const handleOpexChange = (key, val) => {
    const newOpex = { ...opex, [key]: Number(val) || 0 };
    setOpex(newOpex);
    localStorage.setItem('financial_opex', JSON.stringify(newOpex));
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

  // ===================================================
  // AKUNTANSI & KEUANGAN PROFESIONAL (PROFIT & LOSS)
  // ===================================================
  const completedOrders = filteredOrders.filter((o) => o.status === 'lunas');
  const pendingOrders = filteredOrders.filter((o) => o.status === 'pending');

  // Gross Revenue (Omset Kotor Lunas)
  const grossRevenue = completedOrders.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
  const pendingRevenue = pendingOrders.reduce((sum, item) => sum + Number(item.total_price || 0), 0);

  // HPP / Cost of Goods Sold (COGS)
  // Menghitung HPP dari cost_price produk atau estimasi default 60% jika belum diset
  const totalCOGS = completedOrders.reduce((sum, item) => sum + Number(item.cost_price || item.total_price * 0.6), 0);

  // Gross Profit (Laba Kotor)
  const grossProfit = grossRevenue - totalCOGS;

  // Total OPEX (Beban Operasional)
  const totalOPEX = Object.values(opex).reduce((a, b) => a + b, 0);

  // Net Operating Profit (Laba Bersih Operasional)
  const netProfit = grossProfit - totalOPEX;
  const netProfitMargin = grossRevenue > 0 ? ((netProfit / grossRevenue) * 100).toFixed(1) : 0;

  // Analysis Breakdown Cara Bayar
  const paymentMethodSummary = completedOrders.reduce((acc, order) => {
    const method = order.payment_method || 'Transfer Bank';
    acc[method] = (acc[method] || 0) + Number(order.total_price || 0);
    return acc;
  }, {});

  // Export Laporan CSV
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return alert('Tidak ada data untuk diekspor!');

    let csvContent = 'data:text/csv;charset=utf-8,ID Transaksi,Tanggal,Nama Pelanggan,No WA,Detail Items,Total Harga,Cara Bayar,Status\n';
    filteredOrders.forEach((o) => {
      const row = [
        o.id,
        o.created_at ? o.created_at.split('T')[0] : '',
        `"${o.customer_name || ''}"`,
        `"${o.customer_phone || ''}"`,
        `"${o.items || ''}"`,
        o.total_price || 0,
        `"${o.payment_method || 'Transfer Bank'}"`,
        o.status
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Keuangan_${startDate || 'Awal'}_sd_${endDate || 'Akhir'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-3xl bg-slate-800 p-8 shadow-2xl border border-slate-700 space-y-5">
          <div className="text-center">
            <h1 className="text-2xl font-black text-white">Admin Finance</h1>
            <p className="text-xs text-slate-400 mt-1">Masukan password untuk mengelola keuangan</p>
          </div>
          <input
            type="password"
            placeholder="Password admin..."
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            className="w-full rounded-2xl bg-slate-900 border border-slate-700 p-3 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
          <button type="submit" className="w-full rounded-2xl bg-emerald-600 py-3 font-bold text-white hover:bg-emerald-500 transition-all">
            Masuk Portal Admin
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header Professional */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-6">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">Sistem Akuntansi & Manajemen</span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Dashboard Keuangan & Operasional</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('finance')}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                activeTab === 'finance' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              📊 Keuangan & Laba Rugi
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                activeTab === 'orders' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              📦 Transaksi & Cara Bayar
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                activeTab === 'products' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              🎁 Modal & Stok Produk
            </button>
            <button onClick={() => setIsAuthenticated(false)} className="rounded-xl border border-rose-900/50 bg-rose-950/30 px-3 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-900/50">
              🚪 Keluar
            </button>
          </div>
        </div>

        {/* TAB 1: KEUANGAN PROFESIONAL (PROFIT & LOSS STATEMENT) */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            {/* Control Bar Periode Tanggal */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-slate-900 border border-slate-800 p-4">
              <div>
                <h2 className="text-sm font-bold text-white">Laporan Laba Rugi Usaha (Profit & Loss)</h2>
                <p className="text-xs text-slate-400">Ringkasan akuntansi real-time pendapatan kotor, HPP, operasional, dan laba bersih.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-white"
                />
                <span className="text-xs font-bold text-slate-500">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-1.5 text-xs text-white"
                />
                <button
                  onClick={handleExportCSV}
                  className="rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600"
                >
                  📥 Export Laporan CSV
                </button>
              </div>
            </div>

            {/* Top Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Revenue (Omset Lunas)</span>
                <p className="text-2xl font-black text-emerald-400">Rp {grossRevenue.toLocaleString('id-ID')}</p>
                <span className="block text-[10px] text-slate-500">{completedOrders.length} transaksi selesai</span>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">HPP / Modal Bahan Baku</span>
                <p className="text-2xl font-black text-rose-400">Rp {totalCOGS.toLocaleString('id-ID')}</p>
                <span className="block text-[10px] text-slate-500">Modal pokok barang terjual</span>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Beban Operasional</span>
                <p className="text-2xl font-black text-amber-400">Rp {totalOPEX.toLocaleString('id-ID')}</p>
                <span className="block text-[10px] text-slate-500">Packing, pengiriman, overhead</span>
              </div>

              <div className="rounded-2xl border border-emerald-900/50 bg-emerald-950/20 p-5 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Net Profit (Laba Bersih)</span>
                <p className="text-2xl font-black text-emerald-300">Rp {netProfit.toLocaleString('id-ID')}</p>
                <span className="block text-[10px] text-emerald-500/80 font-bold">Margin Keuntungan: {netProfitMargin}%</span>
              </div>
            </div>

            {/* Detail Laporan Akuntansi Laba Rugi & Penginputan Operasional */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Table Income Statement (Laba Rugi Formal) */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
                <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-3 flex justify-between items-center">
                  <span>📑 Financial Statement (Rincian Akuntansi)</span>
                  <span className="text-xs text-slate-500 font-normal">Mata Uang: IDR (Rupiah)</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-300 font-medium">Pendapatan Kotor / Revenue (Lunas)</span>
                    <span className="font-bold text-emerald-400">Rp {grossRevenue.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between items-center py-1 text-rose-400">
                    <span>(-) Harga Pokok Penjualan (HPP / COGS)</span>
                    <span className="font-bold">- Rp {totalCOGS.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-t border-slate-800 font-bold text-slate-200">
                    <span>(=) Gross Profit (Laba Kotor)</span>
                    <span>Rp {grossProfit.toLocaleString('id-ID')}</span>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <span className="text-amber-400 font-bold block">(-) Breakdown Beban Operasional (OPEX):</span>
                    
                    <div className="grid grid-cols-2 gap-2 pl-2">
                      <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800">
                        <span className="text-slate-400">Packaging & Kotak:</span>
                        <input
                          type="number"
                          value={opex.packaging}
                          onChange={(e) => handleOpexChange('packaging', e.target.value)}
                          className="w-24 bg-transparent text-right font-bold text-amber-400 focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800">
                        <span className="text-slate-400">Marketing & Iklan:</span>
                        <input
                          type="number"
                          value={opex.marketing}
                          onChange={(e) => handleOpexChange('marketing', e.target.value)}
                          className="w-24 bg-transparent text-right font-bold text-amber-400 focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800">
                        <span className="text-slate-400">Listrik & Operasional:</span>
                        <input
                          type="number"
                          value={opex.operational}
                          onChange={(e) => handleOpexChange('operational', e.target.value)}
                          className="w-24 bg-transparent text-right font-bold text-amber-400 focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800">
                        <span className="text-slate-400">Biaya Kurir & Kirim:</span>
                        <input
                          type="number"
                          value={opex.shipping}
                          onChange={(e) => handleOpexChange('shipping', e.target.value)}
                          className="w-24 bg-transparent text-right font-bold text-amber-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-3 border-t-2 border-slate-700 font-black text-sm bg-emerald-950/40 p-4 rounded-xl border border-emerald-900/50 mt-4">
                    <span className="text-emerald-400">(=) LABA BERSIH OPERASIONAL (NET PROFIT)</span>
                    <span className="text-emerald-300 text-base">Rp {netProfit.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>

              {/* Sidebar Analisis Cara Bayar & Piutang */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-6">
                <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-3">💳 Stream Kas Masuk per Cara Bayar</h3>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1 text-slate-300">
                      <span>🏦 Transfer Bank</span>
                      <span className="text-emerald-400">Rp {(paymentMethodSummary['Transfer Bank'] || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${grossRevenue > 0 ? ((paymentMethodSummary['Transfer Bank'] || 0) / grossRevenue) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1 text-slate-300">
                      <span>📱 QRIS</span>
                      <span className="text-emerald-400">Rp {(paymentMethodSummary['QRIS'] || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${grossRevenue > 0 ? ((paymentMethodSummary['QRIS'] || 0) / grossRevenue) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1 text-slate-300">
                      <span>💵 Tunai / Cash</span>
                      <span className="text-emerald-400">Rp {(paymentMethodSummary['Tunai / Cash'] || 0).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-950 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${grossRevenue > 0 ? ((paymentMethodSummary['Tunai / Cash'] || 0) / grossRevenue) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Piutang Pelanggan (Pending)</span>
                  <p className="text-xl font-black text-amber-400">Rp {pendingRevenue.toLocaleString('id-ID')}</p>
                  <p className="text-[10px] text-slate-500">{pendingOrders.length} transaksi menanti konfirmasi pembayaran.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MANAJEMEN PESANAN & CARA BAYAR (INTERAKTIF FIX) */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="grid gap-3 rounded-2xl bg-slate-900 border border-slate-800 p-4 sm:grid-cols-5 items-end">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Cari Pesanan</label>
                <input
                  type="text"
                  placeholder="Nama, WA, ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-white"
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
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2 text-xs text-white"
                />
              </div>
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="rounded-xl bg-slate-800 py-2 text-xs font-bold text-slate-300 hover:bg-slate-700"
              >
                Reset Filter
              </button>
            </div>

            {/* Tabel Pesanan Lengkap dengan FIX CARA BAYAR */}
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-4">ID / Tanggal</th>
                    <th className="p-4">Pelanggan</th>
                    <th className="p-4">Detail Items</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Cara Bayar (Interaktif)</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500 italic">
                        Tidak ada transaksi pesanan ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-850 transition-all">
                        <td className="p-4 font-mono font-bold text-emerald-400">
                          #{item.id}
                          <div className="text-[10px] font-normal text-slate-500">
                            {item.created_at ? item.created_at.split('T')[0] : '-'}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-white">{item.customer_name}</div>
                          <div className="text-[10px] text-slate-400">{item.customer_phone}</div>
                        </td>
                        <td className="p-4 text-slate-300">{item.items}</td>
                        <td className="p-4 font-bold text-white">
                          Rp {Number(item.total_price).toLocaleString('id-ID')}
                        </td>

                        {/* CARA BAYAR INTERAKTIF (LANSUNG UPDATE KE SUPABASE) */}
                        <td className="p-4">
                          <select
                            value={item.payment_method || 'Transfer Bank'}
                            onChange={(e) => handlePaymentMethodChange(item.id, e.target.value)}
                            className="rounded-xl bg-slate-950 border border-slate-700 px-3 py-1.5 font-bold text-emerald-300 focus:outline-none focus:border-emerald-500"
                          >
                            <option value="Transfer Bank">🏦 Transfer Bank</option>
                            <option value="QRIS">📱 QRIS</option>
                            <option value="Tunai / Cash">💵 Tunai / Cash</option>
                          </select>
                        </td>

                        <td className="p-4">
                          <select
                            value={item.status}
                            onChange={(e) => handleStatusChange(item.id, e.target.value)}
                            className={`rounded-xl px-3 py-1.5 font-bold text-xs ${
                              item.status === 'lunas' ? 'bg-emerald-950 border border-emerald-800 text-emerald-400' : 'bg-amber-950 border border-amber-800 text-amber-400'
                            }`}
                          >
                            <option value="pending">PENDING</option>
                            <option value="lunas">LUNAS</option>
                          </select>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => sendWhatsApp(item)}
                              className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs text-white font-bold hover:bg-emerald-500"
                            >
                              📱 WA
                            </button>
                            <button
                              onClick={() => setInvoiceOrder(item)}
                              className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
                            >
                              🧾 Invoice
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: MANAJEMEN STOK & HPP PRODUK */}
        {activeTab === 'products' && (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Form Tambah/Edit Produk */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
              <h2 className="text-base font-bold text-white">
                {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
              </h2>
              <form onSubmit={handleSaveProduct} className="space-y-3">
                <input
                  type="text"
                  placeholder="Nama Parcel..."
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
                  required
                />
                <input
                  type="number"
                  placeholder="Harga Jual Pelanggan (Rp)..."
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
                  required
                />
                <input
                  type="number"
                  placeholder="Harga Modal / HPP Produk (Rp)..."
                  value={productForm.cost_price}
                  onChange={(e) => setProductForm({ ...productForm, cost_price: e.target.value })}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
                />
                <input
                  type="number"
                  placeholder="Stok Tersedia..."
                  value={productForm.stock}
                  onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
                  required
                />
                <textarea
                  placeholder="Deskripsi Isi Parcel..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
                  rows={3}
                />
                <input
                  type="text"
                  placeholder="URL Gambar..."
                  value={productForm.image_url}
                  onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
                />
                <div className="flex gap-2">
                  <button type="submit" className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-500">
                    Simpan Produk
                  </button>
                  {editingProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProduct(null);
                        setProductForm({ name: '', price: '', cost_price: '', stock: '', description: '', image_url: '' });
                      }}
                      className="rounded-xl border border-slate-700 bg-slate-800 px-3 text-xs font-bold text-slate-300"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Daftar Produk */}
            <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-4">Produk</th>
                    <th className="p-4">Harga Jual</th>
                    <th className="p-4">Modal (HPP)</th>
                    <th className="p-4">Stok</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td className="p-4 font-semibold text-white">{p.name}</td>
                      <td className="p-4 font-bold text-emerald-400">Rp {Number(p.price).toLocaleString('id-ID')}</td>
                      <td className="p-4 text-rose-400">
                        {p.cost_price ? `Rp ${Number(p.cost_price).toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="p-4 font-bold text-white">{p.stock} pcs</td>
                      <td className="p-4 text-center space-x-2">
                        <button
                          onClick={() => {
                            setEditingProduct(p);
                            setProductForm(p);
                          }}
                          className="text-xs font-bold text-emerald-400 underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="text-xs font-bold text-rose-400 underline"
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

        {/* Modal Printable Invoice */}
        {invoiceOrder && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/80 p-4 z-50">
            <div className="w-full max-w-lg rounded-3xl bg-white text-slate-900 p-8 space-y-4 shadow-2xl">
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-black text-emerald-900">INVOICE OFFICIAL</h2>
                <p className="text-xs text-slate-500">PARCEL STORE - TRANSACTION #{invoiceOrder.id}</p>
              </div>
              <div className="space-y-2 text-xs">
                <p><strong>Nama Pelanggan:</strong> {invoiceOrder.customer_name}</p>
                <p><strong>No. WhatsApp:</strong> {invoiceOrder.customer_phone}</p>
                <p><strong>Detail Items:</strong> {invoiceOrder.items}</p>
                <p><strong>Total Tagihan:</strong> Rp {Number(invoiceOrder.total_price).toLocaleString('id-ID')}</p>
                <p><strong>Metode Pembayaran:</strong> {invoiceOrder.payment_method || 'Transfer Bank'}</p>
                <p><strong>Status Pembayaran:</strong> <span className="uppercase font-bold text-emerald-700">{invoiceOrder.status}</span></p>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button onClick={() => setInvoiceOrder(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700">
                  Tutup
                </button>
                <button onClick={() => window.print()} className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800">
                  🖨️ Cetak / PDF Invoice
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
