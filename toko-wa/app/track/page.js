'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function TrackContent() {
  const searchParams = useSearchParams();
  const [searchId, setSearchId] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [orderResult, setOrderResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const idFromUrl = searchParams.get('id');
    if (idFromUrl) {
      setSearchId(idFromUrl);
      fetchTracking(idFromUrl, '');
    }
  }, [searchParams]);

  const fetchTracking = async (idVal, phoneVal) => {
    setLoading(true);
    setErrorMsg('');
    setOrderResult(null);

    let query = supabase.from('orders').select('*');

    if (idVal) {
      query = query.eq('id', idVal);
    } else if (phoneVal) {
      query = query.eq('customer_phone', phoneVal);
    } else {
      setLoading(false);
      return;
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      setErrorMsg('Pesanan tidak ditemukan. Periksa kembali ID Pesanan atau Nomor HP Anda.');
    } else {
      setOrderResult(data[0]);
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTracking(searchId, searchPhone);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-black text-emerald-800">PARCEL STORE</h1>
          <p className="text-xs text-slate-500 mt-1">Lacak Status Pesanan & Pembayaran Anda</p>
        </div>

        {/* Form Pelacakan */}
        <form onSubmit={handleSearch} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ID Pesanan</label>
            <input
              type="text"
              placeholder="Contoh: 12"
              value={searchId}
              onChange={(e) => {
                setSearchId(e.target.value);
                setSearchPhone('');
              }}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>
          <div className="text-center text-xs text-slate-400 font-bold">— ATAU —</div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nomor WhatsApp / HP</label>
            <input
              type="text"
              placeholder="Contoh: 081234567890"
              value={searchPhone}
              onChange={(e) => {
                setSearchPhone(e.target.value);
                setSearchId('');
              }}
              className="w-full rounded-xl border border-slate-300 p-2.5 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-700 py-3 text-xs font-bold text-white hover:bg-emerald-800 transition"
          >
            {loading ? 'Mencari...' : '🔍 Lacak Pesanan'}
          </button>
        </form>

        {errorMsg && <p className="text-center text-xs font-semibold text-rose-600">{errorMsg}</p>}

        {/* Result Status Tracking */}
        {orderResult && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">ID Pesanan</p>
                <p className="text-lg font-black text-slate-900">#{orderResult.id}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Status</p>
                <span
                  className={`inline-block mt-0.5 px-3 py-1 rounded-full text-xs font-black uppercase ${
                    orderResult.status === 'lunas' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {orderResult.status}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400">Pemesanan Atas Nama:</span>
                <p className="font-bold text-slate-800">{orderResult.customer_name}</p>
              </div>
              <div>
                <span className="text-slate-400">Rincian Items:</span>
                <p className="font-medium text-slate-800">{orderResult.items}</p>
              </div>
              {orderResult.notes && (
                <div>
                  <span className="text-slate-400">Catatan Khusus:</span>
                  <p className="italic text-slate-700">"{orderResult.notes}"</p>
                </div>
              )}
              <div className="pt-2 border-t flex justify-between items-center">
                <span className="font-bold text-slate-600">Total Pembayaran</span>
                <span className="text-base font-black text-emerald-700">
                  Rp {Number(orderResult.total_price).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-xs">Memuat halaman...</div>}>
      <TrackContent />
    </Suspense>
  );
}