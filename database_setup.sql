-- ============================================================
-- SCRIPT LENGKAP PERBAIKAN DATABASE SUPABASE FOUNDIT! (PRO-13)
-- Aplikasi Temuan Barang Hilang di Lingkungan Kampus Polibatam
-- ============================================================
-- Jalankan skrip ini di:
-- Supabase Dashboard -> Project Anda -> SQL Editor -> New Query -> Run
-- ============================================================

-- 1. HAPUS CONSTRAINT LAMA YANG MEMBATASI & MENYEBABKAN ERROR
-- Error: "violates check constraint items_status_check"
ALTER TABLE IF EXISTS items DROP CONSTRAINT IF EXISTS items_status_check;
ALTER TABLE IF EXISTS items DROP CONSTRAINT IF EXISTS items_jenis_check;

-- 2. PASTIKAN SEMUA STRUKTUR KOLOM TABEL 'items' LENGKAP
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS nama_barang TEXT;
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS kategori TEXT;
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS deskripsi TEXT;
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS lokasi TEXT;
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS tanggal TEXT;
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS jenis TEXT DEFAULT 'temuan';
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aktif';
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS penyimpanan TEXT DEFAULT '-';
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS pelapor_id BIGINT;
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS klaim_nama TEXT;
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS klaim_nim TEXT;
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS klaim_kontak TEXT;
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS klaim_bukti TEXT;
ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS klaim_foto TEXT;

-- 3. PASTIKAN STRUKTUR KOLOM TABEL 'users' LENGKAP
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS nim TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'mahasiswa';
ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS email TEXT;
-- Fleksibelkan kolom email agar tidak memblokir pendaftaran lama
ALTER TABLE IF EXISTS users ALTER COLUMN email DROP NOT NULL;

-- 4. TERAPKAN CHECK CONSTRAINT BARU YANG SESUAI DENGAN MODUL PRO-13
-- Status resmi di Modul Proyek 15 (PRO-13): Aktif, Cocok/Ditemukan, Dikembalikan, Ditutup
-- Ditambah status alur pengajuan klaim: proses, selesai, pending, batal
-- Menggunakan LOWER() agar kebal terhadap perbedaan huruf besar/kecil
ALTER TABLE items ADD CONSTRAINT items_status_check 
  CHECK (LOWER(status) IN (
    'aktif', 
    'cocok/ditemukan', 
    'dikembalikan', 
    'ditutup', 
    'proses', 
    'selesai', 
    'pending', 
    'batal'
  ));

-- Jenis laporan resmi: 'temuan' dan 'hilang'
ALTER TABLE items ADD CONSTRAINT items_jenis_check 
  CHECK (LOWER(jenis) IN ('temuan', 'hilang'));

-- 5. RELASI FOREIGN KEY: items.pelapor_id -> users.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'items_pelapor_id_fkey'
  ) THEN
    ALTER TABLE items 
      ADD CONSTRAINT items_pelapor_id_fkey 
      FOREIGN KEY (pelapor_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 6. NORMALISASI DATA LAMA DI DATABASE AGAR SESUAI
UPDATE items SET status = 'aktif' WHERE status IS NULL OR status = '';
UPDATE items SET jenis = LOWER(jenis) WHERE jenis IS NOT NULL;

-- 7. ATUR KEBIJAKAN AKSES (ROW LEVEL SECURITY / RLS)
-- Memastikan pengguna web (anon & authenticated) dapat membaca, menambah, mengubah, dan menghapus data sesuai fitur aplikasi
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Full Access on items" ON items;
CREATE POLICY "Public Full Access on items" ON items
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access on users" ON users;
CREATE POLICY "Public Full Access on users" ON users
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 8. PASTIKAN AKUN ADMIN DEFAULT TERSEDIA
INSERT INTO users (nim, name, email, phone, password, role)
VALUES ('admin', 'Muhammad Rafie Ilham', 'admin@kampus.ac.id', '081234567890', 'admin123', 'admin')
ON CONFLICT (id) DO NOTHING;

