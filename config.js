// ============================================================
// KONFIGURASI DATABASE MYSQL (FOUNDIT! POLIBATAM PBL PRO-13)
// ============================================================

// Deteksi otomatis URL API lokal (Laragon / Apache)
const API_BASE_URL = (function() {
  const loc = window.location;
  const path = loc.pathname;
  const pblIndex = path.indexOf('/PBL/');
  if (pblIndex !== -1) {
    return loc.origin + '/PBL/api/api.php';
  }
  // Fallback untuk root domain atau virtual host
  return loc.origin + '/api/api.php';
})();

/**
 * Client Query Builder MySQL
 * Menyediakan antarmuka fluent chaining yang kompatibel dengan kode frontend
 * dan mengeksekusi operasi CRUD langsung ke backend MySQL melalui PHP API lokal.
 */
class MySQLQueryBuilder {
  constructor(table) {
    this.table = table;
    this.queryParams = { table: table };
    this.method = 'GET';
    this.payload = null;
  }

  select(columns = '*') {
    this.method = 'GET';
    this.queryParams.select = columns;
    return this;
  }

  eq(column, value) {
    this.queryParams[column] = value;
    return this;
  }

  or(filterString) {
    this.queryParams.or = filterString;
    return this;
  }

  order(column, options = {}) {
    const ascending = options.ascending !== false;
    this.queryParams.order = `${column}.${ascending ? 'asc' : 'desc'}`;
    return this;
  }

  limit(count) {
    this.queryParams.limit = count;
    return this;
  }

  single() {
    this.queryParams.single = 'true';
    return this;
  }

  maybeSingle() {
    this.queryParams.single = 'true';
    return this;
  }

  insert(data) {
    this.method = 'POST';
    this.payload = data;
    return this;
  }

  update(data) {
    this.method = 'PUT';
    this.payload = data;
    return this;
  }

  delete() {
    this.method = 'DELETE';
    return this;
  }

  async execute() {
    try {
      const url = new URL(API_BASE_URL);
      for (const [key, val] of Object.entries(this.queryParams)) {
        if (val !== undefined && val !== null) {
          url.searchParams.set(key, val);
        }
      }

      const fetchOptions = {
        method: this.method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (this.payload && (this.method === 'POST' || this.method === 'PUT' || this.method === 'PATCH')) {
        fetchOptions.body = JSON.stringify(this.payload);
      }

      const response = await fetch(url.toString(), fetchOptions);
      const json = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          data: null,
          error: { message: (json && json.error) ? json.error : `HTTP Error ${response.status}: Gagal memproses data MySQL.` }
        };
      }

      return {
        data: json ? json.data : null,
        error: (json && json.error) ? { message: json.error } : null
      };
    } catch (err) {
      console.error('Koneksi API MySQL gagal:', err);
      return {
        data: null,
        error: { message: err.message || 'Koneksi ke backend MySQL gagal. Pastikan Laragon/Apache aktif.' }
      };
    }
  }

  // Dukungan await (Thenable)
  then(onFulfilled, onRejected) {
    return this.execute().then(onFulfilled, onRejected);
  }
}

// Inisialisasi Database Client MySQL
const dbClient = {
  from(table) {
    return new MySQLQueryBuilder(table);
  }
};

// Alias kompatibel penuh agar semua halaman frontend langsung terhubung ke MySQL
const supabaseClient = dbClient;
window.dbClient = dbClient;
window.supabaseClient = dbClient;

// ============================================================
// MASTER DATA & HELPER STATUS
// ============================================================

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

// Pilihan Status Laporan
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
