'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [adminPassword, setAdminPassword] = useState('admin123');
  const [newPassword, setNewPassword] = useState('');

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'products' | 'settings'
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
  const [productForm, setProductForm] = useState({ name: '', price: '', stock: '', description: '', image_url: '' });

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

  // 1. WhatsApp Direct Link
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
    setProductForm({ name: '', price: '', stock: '', description: '', image_url: '' });
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
            <p className="text-xs text-slate-500">Kelola pesanan, stok produk, dan layanan pelanggan.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('orders')}
              className={`rounded-xl px-4 py-2 text-xs font-bold ${
                activeTab === 'orders' ? 'bg-emerald-700 text-white' : 'bg-white border text-slate-700'
              }`}
            >
              📦 Pesanan
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

        {/* TAB 2: MANAJEMEN STOK PRODUK / PARCEL */}
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
                  placeholder="Harga (Rp)..."
                  value={productForm.price}
                  onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                  className="w-full rounded-xl border p-2 text-xs"
                  required
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
                        setProductForm({ name: '', price: '', stock: '', description: '', image_url: '' });
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
                    <th className="p-4">Harga</th>
                    <th className="p-4">Stok</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products.map((p) => (
                    <tr key={p.id}>
                      <td className="p-4 font-semibold text-slate-900">{p.name}</td>
                      <td className="p-4">Rp {Number(p.price).toLocaleString('id-ID')}</td>
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

        {/* TAB 3: PENGATURAN PASSWORD */}
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
