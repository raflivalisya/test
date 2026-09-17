'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [adminPassword, setAdminPassword] = useState('admin123');

  // Active Tab: 'orders' | 'finance' | 'products'
  const [activeTab, setActiveTab] = useState('finance');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [cashTransactions, setCashTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form Input Pemasukan / Pengeluaran Manual
  const [transForm, setTransForm] = useState({
    type: 'pengeluaran', // 'pemasukan' | 'pengeluaran'
    category: 'Operasional',
    amount: '',
    description: ''
  });

  // State Modal Catatan (Notes) Pesanan
  const [editingNoteOrder, setEditingNoteOrder] = useState(null);
  const [noteText, setNoteText] = useState('');

  // Invoice Modal
  const [invoiceOrder, setInvoiceOrder] = useState(null);

  // Form Produk
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
      fetchCashTransactions();
    } else {
      alert('Password salah!');
    }
  };

  // Fetch Data dari Supabase
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

  const fetchCashTransactions = async () => {
    const { data, error } = await supabase.from('cash_transactions').select('*').order('created_at', { ascending: false });
    if (!error && data) setCashTransactions(data);
  };

  // WhatsApp Direct
  const sendWhatsApp = (item) => {
    let phone = item.customer_phone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.slice(1);

    const message = `Halo Kak *${item.customer_name}*,\n\nTerima kasih telah memesan di toko kami!\n\n📌 *Detail Pesanan #${item.id}*:\n- Items: ${item.items}\n- Total: Rp ${Number(item.total_price).toLocaleString('id-ID')}\n- Metode Bayar: *${item.payment_method || 'Transfer Bank'}*\n- Status: *${item.status.toUpperCase()}*${item.notes ? `\n- Catatan: ${item.notes}` : ''}\n\nAda yang bisa kami bantu? 😊`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Update Status Pesanan
  const handleStatusChange = async (id, newStatus) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
    if (!error) {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)));
    } else {
      alert('Gagal memperbarui status: ' + error.message);
    }
  };

  // Update Cara Bayar (Handled with Supabase)
  const handlePaymentMethodChange = async (id, newMethod) => {
    const { error } = await supabase.from('orders').update({ payment_method: newMethod }).eq('id', id);
    if (!error) {
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, payment_method: newMethod } : o)));
    } else {
      alert('Gagal memperbarui cara bayar!\n\nPastikan Anda sudah menjalankan SQL ALTER TABLE di Supabase untuk menambahkan kolom payment_method.\n\nError: ' + error.message);
    }
  };

  // Save Note Pesanan
  const handleOpenNoteModal = (order) => {
    setEditingNoteOrder(order);
    setNoteText(order.notes || '');
  };

  const handleSaveNote = async () => {
    if (!editingNoteOrder) return;
    const { error } = await supabase.from('orders').update({ notes: noteText }).eq('id', editingNoteOrder.id);
    if (!error) {
      setOrders((prev) => prev.map((o) => (o.id === editingNoteOrder.id ? { ...o, notes: noteText } : o)));
      setEditingNoteOrder(null);
      setNoteText('');
    } else {
      alert('Gagal menyimpan catatan: ' + error.message);
    }
  };

  // Input Pemasukan / Pengeluaran Manual Keuangan
  const handleAddCashTransaction = async (e) => {
    e.preventDefault();
    if (!transForm.amount || Number(transForm.amount) <= 0) return alert('Nominal harus lebih dari 0!');

    const { error } = await supabase.from('cash_transactions').insert([
      {
        type: transForm.type,
        category: transForm.category,
        amount: Number(transForm.amount),
        description: transForm.description
      }
    ]);

    if (!error) {
      setTransForm({ type: 'pengeluaran', category: 'Operasional', amount: '', description: '' });
      fetchCashTransactions();
    } else {
      alert('Gagal mencatat transaksi: ' + error.message + '\n\nPastikan tabel cash_transactions sudah dibuat di Supabase.');
    }
  };

  const handleDeleteCashTransaction = async (id) => {
    if (confirm('Hapus transaksi kas ini?')) {
      await supabase.from('cash_transactions').delete().eq('id', id);
      fetchCashTransactions();
    }
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
    if (confirm('Hapus produk ini?')) {
      await supabase.from('products').delete().eq('id', id);
      fetchProducts();
    }
  };

  // Filter Orders
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
  // PERHITUNGAN AKUNTANSI KEUANGAN LENGKAP
  // ===================================================
  const completedOrders = filteredOrders.filter((o) => o.status === 'lunas');
  const pendingOrders = filteredOrders.filter((o) => o.status === 'pending');

  // Pemasukan dari Penjualan Lunas
  const orderSalesRevenue = completedOrders.reduce((sum, item) => sum + Number(item.total_price || 0), 0);
  const pendingRevenue = pendingOrders.reduce((sum, item) => sum + Number(item.total_price || 0), 0);

  // HPP Penjualan (COGS)
  const totalCOGS = completedOrders.reduce((sum, item) => sum + Number(item.cost_price || item.total_price * 0.6), 0);

  // Pemasukan & Pengeluaran Kas Manual
  const manualIncomes = cashTransactions.filter((t) => t.type === 'pemasukan').reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const manualExpenses = cashTransactions.filter((t) => t.type === 'pengeluaran').reduce((sum, t) => sum + Number(t.amount || 0), 0);

  // Total Pendapatan & Pengeluaran
  const totalGrossRevenue = orderSalesRevenue + manualIncomes;
  const grossProfit = totalGrossRevenue - totalCOGS;
  const netProfit = grossProfit - manualExpenses;

  // Export CSV
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) return alert('Tidak ada data untuk diekspor!');

    let csvContent = 'data:text/csv;charset=utf-8,ID Transaksi,Tanggal,Nama Pelanggan,No WA,Detail Items,Total Harga,Cara Bayar,Status,Catatan\n';
    filteredOrders.forEach((o) => {
      const row = [
        o.id,
        o.created_at ? o.created_at.split('T')[0] : '',
        `"${o.customer_name || ''}"`,
        `"${o.customer_phone || ''}"`,
        `"${o.items || ''}"`,
        o.total_price || 0,
        `"${o.payment_method || 'Transfer Bank'}"`,
        o.status,
        `"${o.notes || ''}"`
      ].join(',');
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Keuangan_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-3xl bg-slate-800 p-8 shadow-2xl border border-slate-700 space-y-5">
          <div className="text-center">
            <h1 className="text-2xl font-black text-white">Admin Finance Portal</h1>
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
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-6">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">Sistem Keuangan Professional</span>
            <h1 className="text-2xl sm:text-3xl font-black text-white">Dashboard Admin & Kas Toko</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('finance')}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                activeTab === 'finance' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              💰 Arus Kas & Laba Rugi
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                activeTab === 'orders' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              📦 Pesanan & Cara Bayar
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                activeTab === 'products' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              🎁 Stok & Modal Produk
            </button>
            <button onClick={() => setIsAuthenticated(false)} className="rounded-xl border border-rose-900/50 bg-rose-950/30 px-3 py-2.5 text-xs font-bold text-rose-400 hover:bg-rose-900/50">
              🚪 Keluar
            </button>
          </div>
        </div>

        {/* TAB 1: KEUANGAN, INPUT PEMASUKAN & PENGELUARAN */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Total Pendapatan (Penjualan + Lain)</span>
                <p className="text-2xl font-black text-emerald-400">Rp {totalGrossRevenue.toLocaleString('id-ID')}</p>
                <div className="text-[10px] text-slate-500">
                  Penjualan: Rp {orderSalesRevenue.toLocaleString('id-ID')} | Kas Lain: Rp {manualIncomes.toLocaleString('id-ID')}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">HPP / Modal Pokok Produk</span>
                <p className="text-2xl font-black text-amber-400">Rp {totalCOGS.toLocaleString('id-ID')}</p>
                <span className="text-[10px] text-slate-500">Estimasi modal barang terjual</span>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-rose-400">Total Pengeluaran Kas (Beban)</span>
                <p className="text-2xl font-black text-rose-400">Rp {manualExpenses.toLocaleString('id-ID')}</p>
                <span className="text-[10px] text-slate-500">Gaji, Listrik, Operasional, Packing</span>
              </div>

              <div className="rounded-2xl border border-emerald-800/80 bg-emerald-950/30 p-5 space-y-1">
                <span className="text-[10px] font-bold uppercase text-emerald-300">Laba Bersih (Net Profit)</span>
                <p className="text-2xl font-black text-emerald-300">Rp {netProfit.toLocaleString('id-ID')}</p>
                <span className="text-[10px] text-emerald-500/80 font-bold">Laba Kotor - Total Pengeluaran</span>
              </div>
            </div>

            {/* Input Form Pemasukan & Pengeluaran */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>✏️</span> Catat Pemasukan / Pengeluaran
                </h2>
                <form onSubmit={handleAddCashTransaction} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Jenis Transaksi</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTransForm({ ...transForm, type: 'pengeluaran', category: 'Operasional' })}
                        className={`py-2 rounded-xl text-xs font-bold border ${
                          transForm.type === 'pengeluaran' ? 'bg-rose-900/50 border-rose-500 text-rose-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        🔴 Pengeluaran
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransForm({ ...transForm, type: 'pemasukan', category: 'Pemasukan Lain' })}
                        className={`py-2 rounded-xl text-xs font-bold border ${
                          transForm.type === 'pemasukan' ? 'bg-emerald-900/50 border-emerald-500 text-emerald-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        🟢 Pemasukan
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Kategori</label>
                    <select
                      value={transForm.category}
                      onChange={(e) => setTransForm({ ...transForm, category: e.target.value })}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
                    >
                      {transForm.type === 'pengeluaran' ? (
                        <>
                          <option value="Operasional">Operasional & Listrik</option>
                          <option value="Packing">Bahan Packing & Kotak</option>
                          <option value="Gaji">Gaji Karyawan</option>
                          <option value="Marketing">Iklan & Promo</option>
                          <option value="Bahan Baku">Pembelian Stok Bahan</option>
                          <option value="Lain-lain">Lain-lain</option>
                        </>
                      ) : (
                        <>
                          <option value="Pemasukan Lain">Pemasukan Kas Lain</option>
                          <option value="Modal Tambahan">Modal Pemilik</option>
                          <option value="Penjualan Offline">Penjualan Toko Offline</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Nominal (Rp)</label>
                    <input
                      type="number"
                      placeholder="Contoh: 150000"
                      value={transForm.amount}
                      onChange={(e) => setTransForm({ ...transForm, amount: e.target.value })}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Keterangan / Detail</label>
                    <input
                      type="text"
                      placeholder="Misal: Beli pita & bubble wrap..."
                      value={transForm.description}
                      onChange={(e) => setTransForm({ ...transForm, description: e.target.value })}
                      className="w-full rounded-xl bg-slate-950 border border-slate-800 p-2.5 text-xs text-white"
                    />
                  </div>

                  <button type="submit" className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-500 transition-all">
                    + Simpan Transaksi Kas
                  </button>
                </form>
              </div>

              {/* Tabel Buku Kas Transaksi Manual */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h2 className="text-sm font-bold text-white">📖 Buku Kas / Jurnal Pengeluaran & Pemasukan</h2>
                  <button onClick={handleExportCSV} className="text-xs text-emerald-400 font-bold hover:underline">
                    📥 Download CSV
                  </button>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2">
                  {cashTransactions.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-500 italic">Belum ada catatan pengeluaran / pemasukan kas tambahan.</div>
                  ) : (
                    cashTransactions.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.type === 'pemasukan' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'}`}>
                              {item.category}
                            </span>
                            <span className="text-[10px] text-slate-500">{item.created_at ? item.created_at.split('T')[0] : ''}</span>
                          </div>
                          <p className="text-slate-300">{item.description || 'Tanpa keterangan'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`font-mono font-bold text-sm ${item.type === 'pemasukan' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {item.type === 'pemasukan' ? '+' : '-'} Rp {Number(item.amount).toLocaleString('id-ID')}
                          </span>
                          <button onClick={() => handleDeleteCashTransaction(item.id)} className="text-slate-600 hover:text-rose-400 font-bold">
                            ✕
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MANAJEMEN PESANAN, CARA BAYAR & CATATAN */}
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

            {/* Tabel Orders */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900 shadow-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-4">ID / Tanggal</th>
                    <th className="p-4">Pelanggan</th>
                    <th className="p-4">Detail Items</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Cara Bayar</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Catatan (Notes)</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 italic">
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

                        {/* Dropdown Cara Bayar */}
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

                        {/* Dropdown Status */}
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

                        {/* Catatan (Notes) */}
                        <td className="p-4 max-w-xs">
                          {item.notes ? (
                            <div className="text-slate-300 bg-slate-950 p-2 rounded-xl border border-slate-800 text-[11px] truncate">
                              💬 {item.notes}
                            </div>
                          ) : (
                            <span className="text-slate-600 italic">Belum ada catatan</span>
                          )}
                        </td>

                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => handleOpenNoteModal(item)}
                              className="rounded-xl bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs font-bold text-amber-400 hover:bg-slate-700"
                            >
                              📝 Notes
                            </button>
                            <button
                              onClick={() => sendWhatsApp(item)}
                              className="rounded-xl bg-emerald-600 px-2.5 py-1.5 text-xs text-white font-bold hover:bg-emerald-500"
                            >
                              📱 WA
                            </button>
                            <button
                              onClick={() => setInvoiceOrder(item)}
                              className="rounded-xl bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
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

        {/* TAB 3: MANAJEMEN STOK & PRODUK */}
        {activeTab === 'products' && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4">
              <h2 className="text-base font-bold text-white">
                {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
              </h2>
              <form onSubmit={handleSaveProduct} className="space-y-3">
                <input
                  type="text"
                  placeholder="Nama Produk..."
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
                  placeholder="Deskripsi Produk..."
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

        {/* MODAL: INPUT CATATAN ORDER */}
        {editingNoteOrder && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/80 p-4 z-50">
            <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 text-slate-100 shadow-2xl">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2">
                📝 Catatan Pesanan #{editingNoteOrder.id}
              </h3>
              <p className="text-xs text-slate-400">
                Tambahkan info tambahan seperti alamat pengiriman, instruksi kartu ucapan, atau catatan pembeli.
              </p>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Tulis catatan disini..."
                className="w-full rounded-2xl bg-slate-950 border border-slate-800 p-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                rows={4}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditingNoteOrder(null)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-300"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveNote}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  Simpan Catatan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: PRINTABLE INVOICE */}
        {invoiceOrder && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/80 p-4 z-50">
            <div className="w-full max-w-lg rounded-3xl bg-white text-slate-900 p-8 space-y-4 shadow-2xl">
              <div className="text-center border-b pb-4">
                <h2 className="text-2xl font-black text-emerald-900">INVOICE OFFICIAL</h2>
                <p className="text-xs text-slate-500">TRANSACTION #{invoiceOrder.id}</p>
              </div>
              <div className="space-y-2 text-xs">
                <p><strong>Nama Pelanggan:</strong> {invoiceOrder.customer_name}</p>
                <p><strong>No. WhatsApp:</strong> {invoiceOrder.customer_phone}</p>
                <p><strong>Detail Items:</strong> {invoiceOrder.items}</p>
                <p><strong>Total Tagihan:</strong> Rp {Number(invoiceOrder.total_price).toLocaleString('id-ID')}</p>
                <p><strong>Metode Pembayaran:</strong> {invoiceOrder.payment_method || 'Transfer Bank'}</p>
                <p><strong>Status Pembayaran:</strong> <span className="uppercase font-bold text-emerald-700">{invoiceOrder.status}</span></p>
                {invoiceOrder.notes && <p><strong>Catatan Tambahan:</strong> {invoiceOrder.notes}</p>}
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <button onClick={() => setInvoiceOrder(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-700">
                  Tutup
                </button>
                <button onClick={() => window.print()} className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-800">
                  🖨️ Cetak / PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
