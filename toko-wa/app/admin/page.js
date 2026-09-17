'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [adminPassword, setAdminPassword] = useState('admin123');

  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals
  const [editingOrder, setEditingOrder] = useState(null);
  const [noteInput, setNoteInput] = useState('');
  const [invoiceOrder, setInvoiceOrder] = useState(null);

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

  // Helper WhatsApp Direct Link
  const sendWhatsApp = (item) => {
    let phone = item.customer_phone.replace(/[^0-9]/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.slice(1);

    const message = `Halo Kak *${item.customer_name}*,\n\nTerima kasih telah memesan di Parcel Store!\n\n📌 *Detail Pesanan #${item.id}*:\n- Items: ${item.items}\n- Total: Rp ${Number(item.total_price).toLocaleString('id-ID')}\n- Status: *${item.status.toUpperCase()}*\n\nAnda dapat melacak status pesanan secara mandiri melalui link berikut:\nhttps://website-anda.com/track?id=${item.id}\n\nAda yang bisa kami bantu kembali? 😊`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Filter Pesanan Berdasarkan Pencarian, Status, dan Rentang Tanggal
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
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Dashboard Admin Parcel</h1>
          <button onClick={() => setIsAuthenticated(false)} className="rounded-xl border px-3 py-1.5 text-xs font-semibold">
            🚪 Keluar
          </button>
        </div>

        {/* Filter Tanggal & Pencarian */}
        <div className="mb-6 grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-4 items-end">
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
                <th className="p-4">ID / Tgl</th>
                <th className="p-4">Pelanggan</th>
                <th className="p-4">Detail Pesanan</th>
                <th className="p-4">Total</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-center">Aksi & Kontak</th>
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
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        item.status === 'lunas' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.status.toUpperCase()}
                    </span>
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
    </div>
  );
}
