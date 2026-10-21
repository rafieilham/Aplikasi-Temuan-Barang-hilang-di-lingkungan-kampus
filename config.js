// Konfigurasi Supabase
const SUPABASE_URL = 'https://gevpgogwpnlozyydhkpn.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_i3ICo3V-x1Yxpm68-amHKQ_k-HQFgeS';

// Inisialisasi Supabase Client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);