'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const PRODUCTS = [
  {
    id: 'paket-a',
    name: 'Paket Hemat (Starter)',
    price: 50000,
    originalPrice: 75000,
    description: 'Cocok untuk pemula yang ingin mencoba fitur dasar.',
    badge: 'Paling Laris',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60',
  },
  {
    id: 'paket-b',
    name: 'Paket Premium (Pro)',
    price: 100000,
    originalPrice: 150000,
    description: 'Akses penuh ke semua fitur premium tanpa batasan.',
    badge: 'Best Value',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=60',
  },
];

export default function Home() {
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          customer_name: name,
          customer_phone: phone,
          items: selectedProduct.name,
          total_price: selectedProduct.price,
          status: 'pending',
        },
      ])
      .select();

    if (error) {
      alert(`Gagal membuat order! Error: ${error.message}`);
      setLoading(false);
      return;
    }

    const orderId = data[0].id;
    const waAdmin = process.env.NEXT_PUBLIC_WA_NUMBER;

    const message = `Halo Admin, saya mau konfirmasi pembayaran.%0A%0A*ID Order:* #${orderId}%0A*Nama:* ${name}%0A*Pesanan:* ${selectedProduct.name}%0A*Total:* Rp${selectedProduct.price.toLocaleString('id-ID')}%0A%0ASaya akan kirim bukti transfer setelah ini.`;

    window.location.href = `https://wa.me/${waAdmin}?text=${message}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* Header / Navbar */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-emerald-600">STORE</span>
            <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">Official</span>
          </div>
{/* Tombol Shortcut Admin di Navbar */}
<a
  href="/admin"
  className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
>
  🔒 Admin
</a>
    
    
          <a
            href="#checkout"
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Beli Sekarang
          </a>
        </div>
      </header>

      {/* Hero / Catalog Section */}
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Pilih Paket Terbaik Untukmu</h1>
          <p className="mt-2 text-slate-600">Dapatkan penawaran harga spesial hari ini. Proses cepat via WhatsApp.</p>
        </div>

        {/* Product Cards */}
        <div className="mb-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-2">
          {PRODUCTS.map((prod) => {
            const isSelected = selectedProduct.id === prod.id;
            return (
              <div
                key={prod.id}
                onClick={() => setSelectedProduct(prod)}
                className={`relative cursor-pointer overflow-hidden rounded-2xl border bg-white p-6 transition-all duration-200 hover:shadow-lg ${
                  isSelected ? 'border-2 border-emerald-600 ring-2 ring-emerald-600/20' : 'border-slate-200'
                }`}
              >
                {/* Badge */}
                <span className="absolute right-4 top-4 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                  {prod.badge}
                </span>

                <img src={prod.image} alt={prod.name} className="h-48 w-full rounded-xl object-cover" />

                <div className="mt-5">
                  <h3 className="text-xl font-bold text-slate-900">{prod.name}</h3>
                  <p className="mt-1 text-sm text-slate-500">{prod.description}</p>

                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-600">
                      Rp {prod.price.toLocaleString('id-ID')}
                    </span>
                    <span className="text-sm text-slate-400 line-through">
                      Rp {prod.originalPrice.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <button
                    type="button"
                    className={`mt-4 w-full rounded-xl py-2.5 text-sm font-bold transition ${
                      isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isSelected ? '✓ Dipilih' : 'Pilih Paket Ini'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Form Checkout Section */}
        <section id="checkout" className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
          <h2 className="text-2xl font-bold text-slate-900">Form Pemesanan</h2>
          <p className="mt-1 text-sm text-slate-500">Lengkapi data diri untuk melanjutkan ke pembayaran via WhatsApp.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Summary Box */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4 border border-slate-200">
              <div>
                <p className="text-xs text-slate-500">Produk Dipilih:</p>
                <p className="font-bold text-slate-800">{selectedProduct.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Total Harga:</p>
                <p className="text-lg font-black text-emerald-600">Rp {selectedProduct.price.toLocaleString('id-ID')}</p>
              </div>
            </div>

            {/* Input Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700">Nama Lengkap</label>
              <input
                type="text"
                required
                placeholder="Contoh: Budi Santoso"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Input Phone */}
            <div>
              <label className="block text-sm font-semibold text-slate-700">Nomor WhatsApp</label>
              <input
                type="text"
                required
                placeholder="Contoh: 08123456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-base font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? (
                'Memproses Orderan...'
              ) : (
                <>
                  <span>Pesan & Bayar via WA</span>
                  <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
