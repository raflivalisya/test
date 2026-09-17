'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const [parcels, setParcels] = useState([]);
  const [selectedParcel, setSelectedParcel] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [greetingText, setGreetingText] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Ambil data produk & stok dari Supabase
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setFetching(true);
    const { data, error } = await supabase.from('products').select('*');
    if (!error && data) {
      setParcels(data);
      // Pilih parcel pertama yang masih ada stoknya
      const available = data.find((p) => p.stock > 0) || data[0];
      setSelectedParcel(available);
    }
    setFetching(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedParcel || selectedParcel.stock <= 0) {
      alert('Maaf, stok paket ini sedang habis!');
      return;
    }

    setLoading(true);

    const itemsDescription = `${selectedParcel.name} | Tgl Kirim: ${deliveryDate || 'Secepatnya'} | Ucapan: "${greetingText || '-'}"`;

    // 1. Simpan Pesanan
    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          customer_name: name,
          customer_phone: phone,
          items: itemsDescription,
          total_price: selectedParcel.price,
          status: 'pending',
        },
      ])
      .select();

    if (error) {
      alert(`Gagal membuat pesanan! Error: ${error.message}`);
      setLoading(false);
      return;
    }

    // 2. Kurangi Stok Produk Otomatis (Stock - 1)
    await supabase
      .from('products')
      .update({ stock: selectedParcel.stock - 1 })
      .eq('id', selectedParcel.id);

    const orderId = data[0].id;
    const waAdmin = process.env.NEXT_PUBLIC_WA_NUMBER || '6281234567890';

    const message = `Halo Admin Parcel Store, saya ingin memesan Parcel!%0A%0A` +
      `*ID Order:* #${orderId}%0A` +
      `*Nama Pemesan:* ${name}%0A` +
      `*Paket Parcel:* ${selectedParcel.name}%0A` +
      `*Total Harga:* Rp ${selectedParcel.price.toLocaleString('id-ID')}%0A` +
      `*Tgl Pengiriman:* ${deliveryDate || 'Secepatnya'}%0A` +
      `*Pesan Kartu Ucapan:* "${greetingText || '-'}"%0A%0A` +
      `Mohon diinfokan rekening untuk pembayarannya. Terima kasih!`;

    window.location.href = `https://wa.me/${waAdmin}?text=${message}`;
  };

  return (
    <div className="min-h-screen bg-amber-50/40 text-slate-800">
      <header className="sticky top-0 z-20 border-b border-amber-200/60 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-wide text-emerald-800">PARCEL<span className="text-amber-600">STORE</span></span>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">Hampers & Gift</span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/admin"
              className="rounded-full border border-amber-200 bg-amber-50/50 px-4 py-1.5 text-xs font-bold text-emerald-900 transition hover:bg-amber-100"
            >
              🔒 Admin
            </a>
            <a
              href="#checkout"
              className="rounded-full bg-emerald-700 px-4 py-2 text-xs sm:text-sm font-bold text-white transition hover:bg-emerald-800 shadow-sm"
            >
              Pesan Sekarang
            </a>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-b from-emerald-900 to-emerald-800 py-12 text-white sm:py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <span className="inline-block rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-400/30">
            ✨ Spesial Hari Raya & Event Istimewa
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl text-amber-100">
            Kirim Kebahagiaan Lewat Hampers Eksklusif
          </h1>
          <p className="mt-3 text-sm sm:text-base text-emerald-100/90 max-w-2xl mx-auto">
            Koleksi parcel makanan, kue kering, sembako, dan perlengkapan ibadah dengan kemasan mewah.
          </p>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Pilihan Paket Parcel</h2>
          <p className="mt-1 text-sm text-slate-500">Klik paket di bawah ini untuk memilih dan mengisi form pemesanan.</p>
        </div>

        {fetching ? (
          <div className="text-center py-12 text-slate-400">Memuat katalog parcel...</div>
        ) : (
          <div className="mb-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            {parcels.map((item) => {
              const isSelected = selectedParcel?.id === item.id;
              const isSoldOut = item.stock <= 0;

              return (
                <div
                  key={item.id}
                  onClick={() => !isSoldOut && setSelectedParcel(item)}
                  className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-white p-5 transition-all duration-300 ${
                    isSoldOut
                      ? 'opacity-60 cursor-not-allowed border-slate-200'
                      : isSelected
                      ? 'cursor-pointer border-2 border-emerald-600 ring-4 ring-emerald-600/15 shadow-md'
                      : 'cursor-pointer border-slate-200 hover:shadow-xl'
                  }`}
                >
                  <div>
                    <div className="relative">
                     <div className="relative overflow-hidden rounded-t-2xl">
  {/* 1. Gambar Produk */}
  <img
    src={
      product.image_url || 
      product.image || 
      'https://placehold.co/600x400/e2e8f0/475569?text=Tidak+Ada+Gambar'
    }
    alt={product.name}
    className="h-48 w-full object-cover"
    onError={(e) => {
      e.target.onerror = null;
      e.target.src = 'https://placehold.co/600x400/e2e8f0/475569?text=Gambar+Error';
    }}
  />

  {/* 2. Label Kategori (Pojok Kiri Atas) */}
  {product.category && (
    <span className="absolute top-3 left-3 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold text-white backdrop-blur-md">
      {product.category}
    </span>
  )}

  {/* 3. Badge Highlight (Pojok Kanan Atas - Paling Laris / Mewah / dll) */}
  {product.badge && (
    <span className={`absolute top-3 right-3 rounded-full px-3 py-1 text-[10px] font-extrabold text-white shadow-md ${
      product.badge === 'Paling Laris' ? 'bg-amber-500' :
      product.badge === 'Mewah' ? 'bg-orange-600' :
      product.badge === 'Rekomendasi' ? 'bg-orange-500' :
      'bg-emerald-600'
    }`}>
      {product.badge}
    </span>
  )}
</div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-900">{item.name}</h3>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                          isSoldOut ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          Sisa: {item.stock} Pcs
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{item.description}</p>

                      <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs border border-slate-100">
                        <p className="font-bold text-emerald-800 mb-1">📦 Isi Paket:</p>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                          {item.contents?.map((content, idx) => (
                            <li key={idx}>{content}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-2xl font-black text-emerald-700">
                          Rp {Number(item.price).toLocaleString('id-ID')}
                        </span>
                        {item.original_price && (
                          <span className="ml-2 text-xs text-slate-400 line-through">
                            Rp {Number(item.original_price).toLocaleString('id-ID')}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isSoldOut}
                      className={`mt-3 w-full rounded-xl py-2.5 text-xs font-bold transition ${
                        isSoldOut
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : isSelected
                          ? 'bg-emerald-700 text-white shadow-md'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isSoldOut ? 'Stok Habis' : isSelected ? '✓ Paket Ini Dipilih' : 'Pilih Paket Ini'}
                    </button>
                  </div>
                </div>


        {/* Form Checkout */}
        {selectedParcel && (
          <section id="checkout" className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-white p-6 shadow-xl sm:p-8">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-2xl font-bold text-slate-900">Form Pemesanan Parcel</h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">Lengkapi data untuk konfirmasi pesanan via WhatsApp.</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="flex items-center justify-between rounded-2xl bg-amber-50/80 p-4 border border-amber-200/80">
                <div>
                  <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Parcel Dipilih</p>
                  <p className="font-bold text-slate-900">{selectedParcel.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Total Harga</p>
                  <p className="text-lg font-black text-emerald-700">Rp {Number(selectedParcel.price).toLocaleString('id-ID')}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Nama Pemesan / Penerima</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ibu Rina Syafitri"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Nomor WhatsApp Active</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 08123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Tanggal Rencana Pengiriman</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700">Pesan Kartu Ucapan (Gratis)</label>
                <textarea
                  rows="3"
                  placeholder="Contoh: Selamat Hari Raya Idul Fitri..."
                  value={greetingText}
                  onChange={(e) => setGreetingText(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={loading || selectedParcel.stock <= 0}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-800 disabled:opacity-50"
              >
                {loading ? 'Memproses Pesanan...' : 'Pesan Parcel via WhatsApp'}
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
