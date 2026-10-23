// Konfigurasi Supabase
const SUPABASE_URL = 'https://gevpgogwpnlozyydhkpn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i3ICo3V-x1Yxpm68-amHKQ_k-HQFgeS';

// Inisialisasi Supabase Client
const supabaseClient = (window.supabase && typeof window.supabase.createClient === 'function') 
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

// Kategori Default Master Data
const DEFAULT_CATEGORIES = [
  { id: 1, nama: 'Aksesoris & Dompet', desc: 'Dompet, jam tangan, kacamata, tas kecil, perhiasan', status: 'Aktif' },
  { id: 2, nama: 'Elektronik & Gadget', desc: 'Laptop, smartphone, tablet, charger, powerbank, headset', status: 'Aktif' },
  { id: 3, nama: 'Dokumen & Identitas', desc: 'KTM, KTP, SIM, STNK, buku tabungan, berkas ujian', status: 'Aktif' },
  { id: 4, nama: 'Pakaian & Jaket', desc: 'Jaket kampus, almamater, hoodie, topi, payung', status: 'Aktif' },
  { id: 5, nama: 'Kunci & Kendaraan', desc: 'Kunci motor, kunci mobil, gantungan kunci, helm', status: 'Aktif' },
  { id: 6, nama: 'Perlengkapan Kuliah', desc: 'Buku catatan, modul kuliah, tempat pensil, kalkulator', status: 'Aktif' },
  { id: 7, nama: 'Lain-lain', desc: 'Barang temuan umum lainnya di area kampus', status: 'Aktif' }
];

function getStoredCategories() {
  const saved = localStorage.getItem('foundit_categories');
  if (!saved) {
    localStorage.setItem('foundit_categories', JSON.stringify(DEFAULT_CATEGORIES));
    return DEFAULT_CATEGORIES;
  }
  try {
    return JSON.parse(saved);
  } catch (e) {
    return DEFAULT_CATEGORIES;
  }
}

function saveStoredCategories(cats) {
  localStorage.setItem('foundit_categories', JSON.stringify(cats));
}

// 4 Status Resmi Sesuai FR-04:
// Aktif, Cocok/Ditemukan, Dikembalikan, Ditutup
const STATUS_OPTIONS = [
  { value: 'aktif', label: 'Aktif', badgeClass: 'badge-aktif' },
  { value: 'cocok/ditemukan', label: 'Cocok/Ditemukan', badgeClass: 'badge-cocok' },
  { value: 'dikembalikan', label: 'Dikembalikan', badgeClass: 'badge-dikembalikan' },
  { value: 'ditutup', label: 'Ditutup', badgeClass: 'badge-ditutup' }
];

function normalizeStatus(raw) {
  if (!raw) return 'aktif';
  const s = String(raw).toLowerCase().trim();
  if (s === 'cocok/ditemukan' || s === 'cocok' || s === 'ditemukan' || s === 'proses' || s === 'dalam klaim') {
    return 'cocok/ditemukan';
  }
  if (s === 'dikembalikan' || s === 'selesai') {
    return 'dikembalikan';
  }
  if (s === 'ditutup') {
    return 'ditutup';
  }
  return 'aktif';
}

function getStatusBadge(raw) {
  const norm = normalizeStatus(raw);
  switch (norm) {
    case 'cocok/ditemukan':
      return '<span class="badge-status badge-cocok">Cocok/Ditemukan</span>';
    case 'dikembalikan':
      return '<span class="badge-status badge-dikembalikan">Dikembalikan</span>';
    case 'ditutup':
      return '<span class="badge-status badge-ditutup">Ditutup</span>';
    case 'aktif':
    default:
      return '<span class="badge-status badge-aktif">Aktif</span>';
  }
}