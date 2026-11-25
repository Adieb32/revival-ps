-- ============================================================================
-- SKEMA DATABASE SUPABASE - REVIVAL PLAYSTATION
-- Jalankan skrip ini di SQL Editor Supabase jika ingin sinkronisasi cloud.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.penyewaan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_pelanggan TEXT NOT NULL,
  nomor_whatsapp TEXT NOT NULL,
  jenis_identitas TEXT NOT NULL DEFAULT 'KTP',
  nomor_identitas TEXT,
  foto_identitas TEXT,
  izin_foto BOOLEAN NOT NULL DEFAULT FALSE,
  unit TEXT NOT NULL DEFAULT 'PS3',
  paket_sewa TEXT NOT NULL DEFAULT 'Per jam',
  waktu_mulai TIMESTAMPTZ NOT NULL,
  rencana_kembali TIMESTAMPTZ,
  harga NUMERIC(12, 2) NOT NULL DEFAULT 0,
  pembayaran TEXT NOT NULL DEFAULT 'Belum dibayar',
  status_sewa TEXT NOT NULL DEFAULT 'Disewa',
  catatan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cashflow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  shift TEXT NOT NULL DEFAULT 'Full Day',
  jenis TEXT NOT NULL CHECK (jenis IN ('Pemasukan', 'Pengeluaran')),
  kategori TEXT NOT NULL DEFAULT 'Billing PS',
  uraian TEXT NOT NULL,
  nominal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  metode TEXT NOT NULL DEFAULT 'Tunai (Cash)',
  catatan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.penyewaan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashflow ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Akses penuh penyewaan" ON public.penyewaan;
CREATE POLICY "Akses penuh penyewaan" ON public.penyewaan FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Akses penuh cashflow" ON public.cashflow;
CREATE POLICY "Akses penuh cashflow" ON public.cashflow FOR ALL USING (true) WITH CHECK (true);
