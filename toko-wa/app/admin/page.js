'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [adminPassword, setAdminPassword] = useState('admin123');
  
  // State Navigasi Tab ('orders' atau 'inventory')
  const [activeTab, setActiveTab] = useState('orders');

  // State Data Pesanan & Produk
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search Pesanan
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal Resi / Note
  const [editingOrder, setEditingOrder] = useState(null);
  const [noteInput, setNoteInput] = useState('');
  const [deliveryStatusInput, setDeliveryStatusInput] = useState('Diproses');
  const [trackingNumberInput, setTrackingNumberInput] = useState('');

  // Modal Cetak Label
  const [printOrder, setPrintOrder] = useState(null);

  // Modal Password
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
      fetchProducts();
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

    if (!error && data) setOrders(data);
    setLoading(false);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('id', { ascending: true });

    if (!error && data) setProducts(data);
  };

  // Update Stok Langsung
  const handleUpdateStock = async (id, newStock) => {
    const stockVal = Math.max(0, Number(newStock));
    const { error } = await supabase
      .from('products')
      .update({ stock: stockVal })
      .eq('id', id);

    if (error) {
      alert(`Gagal memperbarui stok: ${error.message}`);
    } else {
      fetchProducts(); // Refresh list produk
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'lunas' ? 'pending' : 'lunas';
    await supabase.from('orders').update({ status: nextStatus }).eq('id', id);
    fetchOrders();
  };

  const handleDeleteOrder = async (id, customerName) => {
    if (!window.confirm(`Hapus pesanan #${id} atas nama "${customerName}"?`)) return;
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (!error) fetchOrders();
  };

  const handleSaveOrderDetails = async () => {
    if (!editingOrder) return;
    await supabase
      .from('orders')
      .update({
        notes: noteInput,
        delivery_status: deliveryStatusInput,
        tracking_number: trackingNumberInput,
      })
      .eq('id', editingOrder.id);

    setEditingOrder(null);
    fetchOrders();
  };

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

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-900">Login Admin</h1>
            <p className="mt-1 text-xs text-slate-500">Masukkan password untuk masuk dashboard.</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              required
              placeholder="Masukkan password..."
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
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
        {/* Header Admin */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Dashboard Admin Parcel</h1>
            <p className="mt-1 text-sm text-slate-500">Kelola pesanan masuk, pengiriman resi, dan stok parcel.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              🔑 Password
            </button>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200"
            >
              🚪 Keluar
            </button>
          </div>
        </div>

        {/* Tab Navigasi Admin (Posisi Menu Stok) */}
        <div className="mb-6 flex gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition ${
              activeTab === 'orders'
                ? 'bg-emerald-700 text-white shadow'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            📋 Pesanan Masuk ({orders.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('inventory');
              fetchProducts();
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition ${
              activeTab === 'inventory'
                ? 'bg-emerald-700 text-white shadow'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            📦 Kelola Stok Produk ({products.length})
          </button>
        </div>

        {/* TAMPILAN TAB 1: DAFTAR PESANAN */}
        {activeTab === 'orders' && (
          <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <input
                type="text"
                placeholder="Cari nama, WA, atau ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm sm:w-72"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                    statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Semua
                </button>
                <button
                  onClick={() => setStatusFilter('lunas')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                    statusFilter === 'lunas' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Lunas
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                    statusFilter === 'pending' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Pending
                </button>
              </div>
            </div>

            {/* Tabel Pesanan */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b">
                  <tr>
                    <th className="px-5 py-4">ID</th>
                    <th className="px-5 py-4">Pelanggan</th>
                    <th className="px-5 py-4">Pesanan</th>
                    <th className="px-5 py-4">Total</th>
                    <th className="px-5 py-4">Pengiriman</th>
                    <th className="px-5 py-4">Bayar</th>
                    <th className="px-5 py-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-4 font-mono font-bold">#{item.id}</td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">{item.customer_name}</div>
                        <div className="text-xs text-slate-400">{item.customer_phone}</div>
                      </td>
                      <td className="px-5 py-4 text-xs">{item.items}</td>
                      <td className="px-5 py-4 font-bold">Rp {Number(item.total_price).toLocaleString('id-ID')}</td>
                      <td className="px-5 py-4 text-xs font-bold text-blue-800">{item.delivery_status || 'Diproses'}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          item.status === 'lunas' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => toggleStatus(item.id, item.status)}
                            className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs text-white"
                          >
                            Status
                          </button>
                          <button
                            onClick={() => {
                              setEditingOrder(item);
                              setNoteInput(item.notes || '');
                              setDeliveryStatusInput(item.delivery_status || 'Diproses');
                              setTrackingNumberInput(item.tracking_number || '');
                            }}
                            className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs text-blue-700 border border-blue-200"
                          >
                            Resi
                          </button>
                          <button
                            onClick={() => setPrintOrder(item)}
                            className="rounded-lg bg-purple-50 px-2.5 py-1.5 text-xs text-purple-700 border border-purple-200"
                          >
                            Cetak
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(item.id, item.customer_name)}
                            className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-rose-700 border border-rose-200"
                          >
                            🗑️
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

        {/* TAMPILAN TAB 2: KELOLA STOK PRODUK (MANAJEMEN STOK) */}
        {activeTab === 'inventory' && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Manajemen Stok Parcel</h2>
            <p className="text-xs text-slate-500 mb-6">Ubah kuota persediaan parcel secara real-time. Jika stok = 0, produk otomatis bertanda "Stok Habis" di halaman depan.</p>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
              {products.map((prod) => (
                <div key={prod.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <img src={prod.image} alt={prod.name} className="h-16 w-16 rounded-lg object-cover" />
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{prod.name}</h4>
                      <p className="text-xs font-bold text-emerald-700">Rp {Number(prod.price).toLocaleString('id-ID')}</p>
                      <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded ${
                        prod.stock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {prod.stock > 0 ? `Tersedia ${prod.stock} Pcs` : 'STOK HABIS'}
                      </span>
                    </div>
                  </div>

                  {/* Input Ubah Stok */}
                  <div className="flex flex-col items-end gap-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Jumlah Stok</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        defaultValue={prod.stock}
                        id={`stock-input-${prod.id}`}
                        className="w-20 rounded-lg border border-slate-300 p-1.5 text-center text-sm font-bold focus:border-emerald-600 focus:outline-none"
                      />
                      <button
                        onClick={() => {
                          const val = document.getElementById(`stock-input-${prod.id}`).value;
                          handleUpdateStock(prod.id, val);
                        }}
                        className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-800 shadow"
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MODAL EDIT RESI */}
        {editingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
              <h3 className="text-lg font-bold">Edit Resi & Status Kirim #{editingOrder.id}</h3>
              <div>
                <label className="block text-xs font-bold">Status Kirim</label>
                <select
                  value={deliveryStatusInput}
                  onChange={(e) => setDeliveryStatusInput(e.target.value)}
                  className="w-full rounded-xl border p-2 text-sm mt-1"
                >
                  <option value="Diproses">Diproses / Packing</option>
                  <option value="Dikirim">Dalam Pengiriman</option>
                  <option value="Selesai">Tiba di Tujuan</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold">No Resi / Kurir</label>
                <input
                  type="text"
                  value={trackingNumberInput}
                  onChange={(e) => setTrackingNumberInput(e.target.value)}
                  className="w-full rounded-xl border p-2 text-sm mt-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditingOrder(null)} className="rounded-xl border px-4 py-2 text-xs">Batal</button>
                <button onClick={handleSaveOrderDetails} className="rounded-xl bg-emerald-700 px-4 py-2 text-xs text-white font-bold">Simpan</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
