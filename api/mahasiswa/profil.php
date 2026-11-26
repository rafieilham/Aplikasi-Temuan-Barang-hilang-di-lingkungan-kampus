<?php
// ============================================================
// BACKEND MAHASISWA: STATISTIK & PROFIL MAHASISWA
// Dibuat khusus untuk Modul Mahasiswa (PBL PRO-13)
// ============================================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../db.php';

try {
    $pelaporId = isset($_GET['pelapor_id']) ? (int)$_GET['pelapor_id'] : null;
    $nim = isset($_GET['nim']) ? trim($_GET['nim']) : null;

    if (!$pelaporId && !$nim) {
        http_response_code(400);
        echo json_encode(['error' => 'Parameter pelapor_id atau nim wajib disertakan.', 'data' => null]);
        exit;
    }

    // Ambil data profil mahasiswa
    $sqlUser = "SELECT `id`, `nim`, `name`, `email`, `phone`, `role`, `created_at` FROM `users` WHERE ";
    $sqlUser .= $pelaporId ? "`id` = :pid" : "`nim` = :nim";
    $stmtUser = $pdo->prepare($sqlUser);
    $stmtUser->execute($pelaporId ? [':pid' => $pelaporId] : [':nim' => $nim]);
    $user = $stmtUser->fetch();

    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'Data mahasiswa tidak ditemukan.', 'data' => null]);
        exit;
    }

    $actualId = (int)$user['id'];
    $actualNim = $user['nim'];

    // Statistik laporan yang diajukan oleh mahasiswa
    $stmtLaporan = $pdo->prepare("SELECT 
        COUNT(*) AS total_laporan,
        SUM(CASE WHEN LOWER(status) = 'aktif' THEN 1 ELSE 0 END) AS laporan_aktif,
        SUM(CASE WHEN LOWER(status) IN ('cocok/ditemukan', 'cocok', 'ditemukan', 'proses') THEN 1 ELSE 0 END) AS laporan_klaim,
        SUM(CASE WHEN LOWER(status) IN ('dikembalikan', 'selesai') THEN 1 ELSE 0 END) AS laporan_kembali
        FROM `items` WHERE `pelapor_id` = :pid");
    $stmtLaporan->execute([':pid' => $actualId]);
    $statLaporan = $stmtLaporan->fetch();

    // Statistik klaim yang diajukan oleh mahasiswa
    $stmtKlaim = $pdo->prepare("SELECT 
        COUNT(*) AS total_klaim_diajukan,
        SUM(CASE WHEN LOWER(status) IN ('cocok/ditemukan', 'cocok', 'ditemukan', 'proses') THEN 1 ELSE 0 END) AS klaim_menunggu,
        SUM(CASE WHEN LOWER(status) IN ('dikembalikan', 'selesai') THEN 1 ELSE 0 END) AS klaim_berhasil
        FROM `items` WHERE `klaim_nim` = :nim");
    $stmtKlaim->execute([':nim' => $actualNim]);
    $statKlaim = $stmtKlaim->fetch();

    echo json_encode([
        'data' => [
            'profil'     => $user,
            'statistik'  => [
                'total_laporan'   => (int)($statLaporan['total_laporan'] ?? 0),
                'laporan_aktif'   => (int)($statLaporan['laporan_aktif'] ?? 0),
                'laporan_klaim'   => (int)($statLaporan['laporan_klaim'] ?? 0),
                'laporan_kembali' => (int)($statLaporan['laporan_kembali'] ?? 0),
                'total_klaim'     => (int)($statKlaim['total_klaim_diajukan'] ?? 0),
                'klaim_menunggu'  => (int)($statKlaim['klaim_menunggu'] ?? 0),
                'klaim_berhasil'  => (int)($statKlaim['klaim_berhasil'] ?? 0)
            ]
        ],
        'error' => null
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage(), 'data' => null]);
}
