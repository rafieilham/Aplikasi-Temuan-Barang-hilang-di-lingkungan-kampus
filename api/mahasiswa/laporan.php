<?php
// ============================================================
// BACKEND MAHASISWA: PENGELOLAAN LAPORAN TEMUAN & KEHILANGAN
// Dibuat khusus untuk Modul Mahasiswa (PBL PRO-13)
// ============================================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
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
        case 'GET':
            // Ambil daftar laporan saya atau katalog publik
            $pelaporId = isset($_GET['pelapor_id']) ? (int)$_GET['pelapor_id'] : null;
            $status    = isset($_GET['status']) ? trim($_GET['status']) : null;
            $kategori  = isset($_GET['kategori']) ? trim($_GET['kategori']) : null;
            $q         = isset($_GET['q']) ? trim($_GET['q']) : null;

            $sql = "SELECT i.*, u.name AS pelapor_nama, u.nim AS pelapor_nim, u.phone AS pelapor_phone 
                    FROM `items` i 
                    LEFT JOIN `users` u ON i.pelapor_id = u.id 
                    WHERE 1=1";
            $params = [];

            if ($pelaporId) {
                $sql .= " AND i.pelapor_id = :pelapor_id";
                $params[':pelapor_id'] = $pelaporId;
            }
            if ($status && $status !== 'semua') {
                $sql .= " AND LOWER(i.status) = :status";
                $params[':status'] = strtolower($status);
            }
            if ($kategori && $kategori !== 'semua') {
                $sql .= " AND i.kategori = :kategori";
                $params[':kategori'] = $kategori;
            }
            if ($q) {
                $sql .= " AND (i.nama_barang LIKE :q OR i.deskripsi LIKE :q OR i.lokasi LIKE :q)";
                $params[':q'] = "%$q%";
            }

            $sql .= " ORDER BY i.id DESC";

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $items = $stmt->fetchAll();

            echo json_encode(['data' => $items, 'error' => null]);
            break;

        case 'POST':
            // Tambah laporan barang baru oleh mahasiswa
            $nama     = trim($body['nama_barang'] ?? '');
            $kategori = trim($body['kategori'] ?? '');
            $lokasi   = trim($body['lokasi'] ?? '');
            $tanggal  = trim($body['tanggal'] ?? date('Y-m-d'));
            $jenis    = trim($body['jenis'] ?? 'temuan');
            $deskripsi= trim($body['deskripsi'] ?? '');
            $pelaporId= !empty($body['pelapor_id']) ? (int)$body['pelapor_id'] : null;
            $fotoUrl  = $body['foto_url'] ?? null;

            if (empty($nama) || empty($kategori) || empty($lokasi)) {
                http_response_code(400);
                echo json_encode(['error' => 'Nama barang, kategori, dan lokasi wajib diisi.', 'data' => null]);
                exit;
            }

            $sql = "INSERT INTO `items` 
                    (`nama_barang`, `kategori`, `deskripsi`, `lokasi`, `tanggal`, `jenis`, `status`, `penyimpanan`, `foto_url`, `pelapor_id`) 
                    VALUES 
                    (:nama, :kategori, :deskripsi, :lokasi, :tanggal, :jenis, 'aktif', '-', :foto_url, :pelapor_id)";
            
            $stmt = $pdo->prepare($sql);
            $stmt->execute([
                ':nama'       => $nama,
                ':kategori'   => $kategori,
                ':deskripsi'  => $deskripsi,
                ':lokasi'     => $lokasi,
                ':tanggal'    => $tanggal,
                ':jenis'      => $jenis,
                ':foto_url'   => $fotoUrl,
                ':pelapor_id' => $pelaporId
            ]);

            $newId = $pdo->lastInsertId();
            echo json_encode(['data' => ['id' => (int)$newId, 'status' => 'aktif', 'nama_barang' => $nama], 'error' => null]);
            break;

        case 'DELETE':
            // Hapus laporan milik mahasiswa
            $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
            $pelaporId = isset($_GET['pelapor_id']) ? (int)$_GET['pelapor_id'] : null;

            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'ID laporan tidak ditentukan.', 'data' => null]);
                exit;
            }

            $sql = "DELETE FROM `items` WHERE `id` = :id";
            $params = [':id' => $id];
            if ($pelaporId) {
                $sql .= " AND `pelapor_id` = :pelapor_id";
                $params[':pelapor_id'] = $pelaporId;
            }

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);

            echo json_encode(['data' => true, 'error' => null]);
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
