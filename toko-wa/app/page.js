'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

// Data Produk Parcel / Hampers
const PARCELS = [
  {
    id: 'prc-silver',
    name: 'Parcel Silver Delight',
    price: 199000,
    originalPrice: 250000,
    category: 'Makanan & Sembako',
    description: 'Pilihan hemat isi Biskuit Kaleng, Sirup Premium, Teh Celup, Kopi, Gula Pasir 1kg & Minyak 1L.',
    badge: 'Paling Laris',
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=600&auto=format&fit=crop&q=80',
    contents: ['Biskuit Kaleng Premium', 'Sirup Marjan / ABC', 'Teh Celup & Kopi', 'Gula 1kg & Minyak 1L', 'Kartu Ucapan + Keranjang']
  },
  {
    id: 'prc-gold',
    name: 'Parcel Gold Mubarak',
    price: 350000,
    originalPrice: 450000,
    category: 'Kombinasi Premium',
    description: 'Kombinasi kue kering homemade, kurma premium, serta perlengkapan ibadah eksklusif.',
    badge: 'Rekomendasi',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=600&auto=format&fit=crop&q=80',
    contents: ['Nastar & Kastengel Premium', 'Kurma Sukari 500g', 'Sirup Premium', 'Sajadah Travel & Tasbih', 'Box Hardcover Eksklusif']
  },
  {
    id: 'prc-platinum',
    name: 'Parcel Platinum Royal',
    price: 650000,
    originalPrice: 750000,
    category: 'Exclusive Hampers',
    description: 'Hampers mewah berisi cangkir keramik, kue kering premium, dan minuman kesehatan.',
    badge: 'Mewah',
    image: 'https://images.unsplash.com/photo-1513201099705-a9746e1e201f?w=600&auto=format&fit=crop&q=80',
    contents: ['Set Cangkir Keramik Aesthetic', '4 Jar Kue Kering Premium', 'Kurma Ajwa 500g', 'Madu Murni & Sparkling Juice', 'Rattan Basket + Pita Silk']
  },
  {
    id: 'prc-sultan',
    name: 'Parcel Sultan Heritage',
    price: 1100000,
    originalPrice: 1250000,
    category: 'Corporate Gift',
    description: 'Parcel kelas atas untuk relasi bisnis, direksi, dan keluarga tercinta.',
    badge: 'Sultan Choice',
    image: 'https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?w=600&auto=format&fit=crop&q=80',
    contents: ['Mawaddah Tea Set Complete', 'Cokelat Impor Premium', '6 Jar Special Cookies', 'Sajadah Velvet & Aroma Diffuser', 'Custom Wooden Box Premium']
  }
];

export default function Home() {
  const [selectedParcel, setSelectedParcel] = useState(PARCELS[0]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [greetingText, setGreetingText] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Keterangan gabungan pesanan + pesan di kartu ucapan + tgl kirim
    const itemsDescription = `${selectedParcel.name} | Tgl Kirim: ${deliveryDate || 'Secepatnya'} | Ucapan: "${greetingText || '-'}"`;

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
      {/* Header / Navbar */}
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

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-emerald-900 to-emerald-800 py-12 text-white sm:py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <span className="inline-block rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-300 border border-amber-400/30">
            ✨ Spesial Hari Raya & Event Istimewa
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl text-amber-100">
            Kirim Kebahagiaan Lewat Hampers Eksklusif
          </h1>
          <p className="mt-3 text-sm sm:text-base text-emerald-100/90 max-w-2xl mx-auto">
            Koleksi parcel makanan, kue kering, sembako, dan perlengkapan ibadah dengan kemasan mewah. Gratis custom kartu ucapan!
          </p>
        </div>
      </section>

      {/* Katalog Produk */}
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Pilihan Paket Parcel</h2>
          <p className="mt-1 text-sm text-slate-500">Klik paket di bawah ini untuk memilih dan mengisi form pemesanan.</p>
        </div>

        <div className="mb-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {PARCELS.map((item) => {
            const isSelected = selectedParcel.id === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedParcel(item)}
                className={`relative flex flex-col justify-between cursor-pointer overflow-hidden rounded-2xl border bg-white p-5 transition-all duration-300 hover:shadow-xl ${
                  isSelected ? 'border-2 border-emerald-600 ring-4 ring-emerald-600/15 shadow-md' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="relative">
                    <img src={item.image} alt={item.name} className="h-52 w-full rounded-xl object-cover" />
                    <span className="absolute right-3 top-3 rounded-full bg-amber-500 px-3 py-1 text-xs font-extrabold text-white shadow">
                      {item.badge}
                    </span>
                    <span className="absolute left-3 top-3 rounded-full bg-slate-900/70 backdrop-blur-sm px-3 py-1 text-xs font-medium text-white">
                      {item.category}
                    </span>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-xl font-bold text-slate-900">{item.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">{item.description}</p>

                    {/* Daftar Isi Parcel */}
                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs border border-slate-100">
                      <p className="font-bold text-emerald-800 mb-1">📦 Isi Paket:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                        {item.contents.map((content, idx) => (
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
                        Rp {item.price.toLocaleString('id-ID')}
                      </span>
                      <span className="ml-2 text-xs text-slate-400 line-through">
                        Rp {item.originalPrice.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`mt-3 w-full rounded-xl py-2.5 text-xs font-bold transition ${
                      isSelected ? 'bg-emerald-700 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isSelected ? '✓ Paket Ini Dipilih' : 'Pilih Paket Ini'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Form Checkout Section */}
        <section id="checkout" className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-white p-6 shadow-xl sm:p-8">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-2xl font-bold text-slate-900">Form Pemesanan Parcel</h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">Lengkapi data di bawah ini untuk konfirmasi pesanan via WhatsApp.</p>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Ringkasan Produk Dipilih */}
            <div className="flex items-center justify-between rounded-2xl bg-amber-50/80 p-4 border border-amber-200/80">
              <div>
                <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Parcel Dipilih</p>
                <p className="font-bold text-slate-900">{selectedParcel.name}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Total Harga</p>
                <p className="text-lg font-black text-emerald-700">Rp {selectedParcel.price.toLocaleString('id-ID')}</p>
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
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
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
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Tanggal Rencana Pengiriman</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Pesan Kartu Ucapan (Gratis)</label>
              <textarea
                rows="3"
                placeholder="Contoh: Selamat Hari Raya Idul Fitri, Minta Maaf Lahir & Batin dari Keluarga Ahmad."
                value={greetingText}
                onChange={(e) => setGreetingText(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/20"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-800 disabled:opacity-50"
            >
              {loading ? (
                'Memproses Pesanan...'
              ) : (
                <>
                  <span>Pesan Parcel via WhatsApp</span>
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
