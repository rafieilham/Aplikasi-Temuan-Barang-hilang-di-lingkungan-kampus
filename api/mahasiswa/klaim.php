<?php
// ============================================================
// BACKEND MAHASISWA: PENGAJUAN & PEMBATALAN KLAIM BARANG
// Dibuat khusus untuk Modul Mahasiswa (PBL PRO-13)
// ============================================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../db.php';

$method = $_SERVER['REQUEST_METHOD'];
$body = json_decode(file_get_contents('php://input'), true) ?: $_POST;

try {
    switch ($method) {
        case 'POST':
            // Mahasiswa mengajukan klaim atas barang temuan
            $itemId      = isset($body['item_id']) ? (int)$body['item_id'] : null;
            $nama        = trim($body['klaim_nama'] ?? '');
            $nim         = trim($body['klaim_nim'] ?? '');
            $kontak      = trim($body['klaim_kontak'] ?? '');
            $bukti       = trim($body['klaim_bukti'] ?? '');
            $fotoBukti   = $body['klaim_foto'] ?? null;

            if (!$itemId || empty($nama) || empty($nim) || empty($kontak)) {
                http_response_code(400);
                echo json_encode(['error' => 'Data formulir klaim tidak lengkap.', 'data' => null]);
                exit;
            }

            // Periksa status barang saat ini
            $checkStmt = $pdo->prepare("SELECT status FROM `items` WHERE `id` = :id LIMIT 1");
            $checkStmt->execute([':id' => $itemId]);
            $current = $checkStmt->fetch();

            if (!$current) {
                http_response_code(404);
                echo json_encode(['error' => 'Barang tidak ditemukan di sistem.', 'data' => null]);
                exit;
            }

            $currentStatus = strtolower(trim($current['status']));
            if (in_array($currentStatus, ['dikembalikan', 'ditutup'], true)) {
                http_response_code(400);
                echo json_encode(['error' => 'Barang ini telah berstatus final (selesai) dan tidak dapat diklaim.', 'data' => null]);
                exit;
            }

            // Update status barang menjadi 'cocok/ditemukan' (dalam klaim)
            $sql = "UPDATE `items` SET 
                    `status` = 'cocok/ditemukan',
                    `klaim_nama` = :nama,
                    `klaim_nim` = :nim,
                    `klaim_kontak` = :kontak,
                    `klaim_bukti` = :bukti,
                    `klaim_foto` = :foto
                    WHERE `id` = :id";

            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':nama'   => $nama,
                ':nim'    => $nim,
                ':kontak' => $kontak,
                ':bukti'  => $bukti,
                ':foto'   => $fotoBukti,
                ':id'     => $itemId
            ]);

            echo json_encode([
                'data' => [
                    'id'     => $itemId,
                    'status' => 'cocok/ditemukan',
                    'message'=> 'Pengajuan klaim berhasil dikirim. Menunggu verifikasi petugas K3 kampus.'
                ],
                'error' => null
            ]);
            break;

        case 'PUT':
            // Mahasiswa membatalkan klaim miliknya sendiri
            $itemId = isset($body['item_id']) ? (int)$body['item_id'] : null;
            $nim    = isset($body['nim']) ? trim($body['nim']) : null;

            if (!$itemId) {
                http_response_code(400);
                echo json_encode(['error' => 'ID barang tidak ditentukan.', 'data' => null]);
                exit;
            }

            $sql = "UPDATE `items` SET 
                    `status` = 'aktif',
                    `klaim_nama` = NULL,
                    `klaim_nim` = NULL,
                    `klaim_kontak` = NULL,
                    `klaim_bukti` = NULL,
                    `klaim_foto` = NULL
                    WHERE `id` = :id";
            $params = [':id' => $itemId];

            if ($nim) {
                $sql .= " AND `klaim_nim` = :nim";
                $params[':nim'] = $nim;
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            echo json_encode([
                'data' => ['id' => $itemId, 'status' => 'aktif', 'message' => 'Klaim berhasil dibatalkan.'],
                'error' => null
            ]);
            break;

        default:
            http_response_code(405);
            echo json_encode(['error' => 'Metode HTTP tidak didukung.', 'data' => null]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage(), 'data' => null]);
}
