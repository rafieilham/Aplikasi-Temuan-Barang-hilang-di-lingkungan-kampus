<?php
// ============================================================
// REST API BACKEND MYSQL FOUNDIT! POLIBATAM (PBL PRO-13)
// ============================================================

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

// Validasi tabel yang diperbolehkan
$allowedTables = ['items', 'users'];
$table = isset($_GET['table']) ? strtolower(trim($_GET['table'])) : '';

if (!in_array($table, $allowedTables, true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Tabel tidak valid atau tidak ditentukan.', 'data' => null]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
if (isset($_POST['_method'])) {
    $method = strtoupper($_POST['_method']);
} elseif (isset($_GET['_method'])) {
    $method = strtoupper($_GET['_method']);
}

// Ambil input JSON dari request body
$rawInput = file_get_contents('php://input');
$body = json_decode($rawInput, true);

try {
    switch ($method) {
        case 'GET':
            handleGet($pdo, $table);
            break;

        case 'POST':
            handlePost($pdo, $table, $body);
            break;

        case 'PUT':
        case 'PATCH':
            handlePut($pdo, $table, $body);
            break;

        case 'DELETE':
            handleDelete($pdo, $table);
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

// ============================================================
// HANDLER: GET (SELECT)
// ============================================================
function handleGet(PDO $pdo, string $table) {
    $select = isset($_GET['select']) ? trim($_GET['select']) : '*';
    if ($select === '' || $select === '*') {
        $selectCols = '*';
    } else {
        // Sanitasi kolom yang diminta
        $cols = array_map('trim', explode(',', $select));
        $validCols = [];
        foreach ($cols as $col) {
            if (preg_match('/^[a-zA-Z0-9_]+$/', $col)) {
                $validCols[] = "`$col`";
            }
        }
        $selectCols = !empty($validCols) ? implode(', ', $validCols) : '*';
    }

    $whereClauses = [];
    $params = [];

    // Filter langsung via parameter query (misal ?id=5 atau ?pelapor_id=3)
    $specialKeys = ['table', 'select', 'order', 'limit', 'offset', 'or', 'single', '_method'];
    foreach ($_GET as $key => $val) {
        if (!in_array($key, $specialKeys, true) && preg_match('/^[a-zA-Z0-9_]+$/', $key)) {
            $whereClauses[] = "`$key` = :p_$key";
            $params[":p_$key"] = $val;
        }
    }

    // Filter klausa OR khusus (misal ?or=nim.eq.admin,email.eq.admin)
    if (!empty($_GET['or'])) {
        $rawOr = trim($_GET['or'], '() ');
        $orParts = explode(',', $rawOr);
        $subOrs = [];
        $i = 0;
        foreach ($orParts as $part) {
            if (strpos($part, '.eq.') !== false) {
                [$col, $val] = explode('.eq.', $part, 2);
                $col = trim($col);
                $val = trim($val);
                if (preg_match('/^[a-zA-Z0-9_]+$/', $col)) {
                    $paramName = ":or_val_{$i}";
                    $subOrs[] = "`$col` = $paramName";
                    $params[$paramName] = $val;
                    $i++;
                }
            }
        }
        if (!empty($subOrs)) {
            $whereClauses[] = '(' . implode(' OR ', $subOrs) . ')';
        }
    }

    $sql = "SELECT $selectCols FROM `$table`";
    if (!empty($whereClauses)) {
        $sql .= " WHERE " . implode(' AND ', $whereClauses);
    }

    // Pengurutan (ORDER BY)
    if (!empty($_GET['order'])) {
        // Format: id.desc atau id.asc atau id:desc
        $orderRaw = trim($_GET['order']);
        $orderParts = preg_split('/[\.:]/', $orderRaw);
        $orderCol = $orderParts[0] ?? 'id';
        $orderDir = strtoupper($orderParts[1] ?? 'ASC');
        if (!in_array($orderDir, ['ASC', 'DESC'], true)) {
            $orderDir = 'ASC';
        }
        if (preg_match('/^[a-zA-Z0-9_]+$/', $orderCol)) {
            $sql .= " ORDER BY `$orderCol` $orderDir";
        }
    } else {
        $sql .= " ORDER BY `id` DESC";
    }

    // Batasan jumlah (LIMIT)
    if (!empty($_GET['limit'])) {
        $limit = (int)$_GET['limit'];
        $sql .= " LIMIT $limit";
        if (!empty($_GET['offset'])) {
            $offset = (int)$_GET['offset'];
            $sql .= " OFFSET $offset";
        }
    }

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    // Jika dipanggil dengan flag single=true atau maybeSingle
    if (!empty($_GET['single']) && $_GET['single'] === 'true') {
        echo json_encode(['data' => $rows[0] ?? null, 'error' => null]);
        return;
    }

    echo json_encode(['data' => $rows, 'error' => null]);
}

// ============================================================
// HANDLER: POST (INSERT)
// ============================================================
function handlePost(PDO $pdo, string $table, $body) {
    if (empty($body)) {
        $body = $_POST;
    }

    if (empty($body)) {
        http_response_code(400);
        echo json_encode(['error' => 'Data input kosong atau tidak valid.', 'data' => null]);
        return;
    }

    // Jika array of objects (batch insert), ambil record pertama atau iterasi
    $isBatch = isset($body[0]) && is_array($body[0]);
    $records = $isBatch ? $body : [$body];
    $insertedRows = [];

    foreach ($records as $row) {
        $cols = [];
        $placeholders = [];
        $params = [];

        foreach ($row as $col => $val) {
            if (preg_match('/^[a-zA-Z0-9_]+$/', $col) && $col !== 'id') {
                $cols[] = "`$col`";
                $placeholders[] = ":$col";
                $params[":$col"] = $val;
            }
        }

        if (empty($cols)) continue;

        $sql = "INSERT INTO `$table` (" . implode(', ', $cols) . ") VALUES (" . implode(', ', $placeholders) . ")";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $lastId = $pdo->lastInsertId();

        // Ambil data yang baru saja dimasukkan
        $fetchStmt = $pdo->prepare("SELECT * FROM `$table` WHERE `id` = :id LIMIT 1");
        $fetchStmt->execute([':id' => $lastId]);
        $insertedRow = $fetchStmt->fetch();
        $insertedRows[] = $insertedRow ?: array_merge(['id' => (int)$lastId], $row);
    }

    $resultData = $isBatch ? $insertedRows : ($insertedRows[0] ?? null);
    echo json_encode(['data' => $resultData, 'error' => null]);
}

// ============================================================
// HANDLER: PUT / PATCH (UPDATE)
// ============================================================
function handlePut(PDO $pdo, string $table, $body) {
    if (empty($body)) {
        http_response_code(400);
        echo json_encode(['error' => 'Data pembaharuan kosong.', 'data' => null]);
        return;
    }

    $whereClauses = [];
    $params = [];

    // Filter id dari query parameter atau dari body
    $targetId = $_GET['id'] ?? $body['id'] ?? null;
    if ($targetId !== null) {
        $whereClauses[] = "`id` = :target_id";
        $params[':target_id'] = $targetId;
    }

    // Parameter query filter lainnya
    $specialKeys = ['table', 'select', 'order', 'limit', 'offset', 'or', 'single', '_method', 'id'];
    foreach ($_GET as $key => $val) {
        if (!in_array($key, $specialKeys, true) && preg_match('/^[a-zA-Z0-9_]+$/', $key)) {
            $whereClauses[] = "`$key` = :filter_$key";
            $params[":filter_$key"] = $val;
        }
    }

    if (empty($whereClauses)) {
        http_response_code(400);
        echo json_encode(['error' => 'Update ditolak: tidak ada kriteria WHERE / id yang ditentukan.', 'data' => null]);
        return;
    }

    $updateSets = [];
    foreach ($body as $col => $val) {
        if (preg_match('/^[a-zA-Z0-9_]+$/', $col) && $col !== 'id') {
            $updateSets[] = "`$col` = :upd_$col";
            $params[":upd_$col"] = $val;
        }
    }

    if (empty($updateSets)) {
        http_response_code(400);
        echo json_encode(['error' => 'Tidak ada kolom yang diubah.', 'data' => null]);
        return;
    }

    $sql = "UPDATE `$table` SET " . implode(', ', $updateSets) . " WHERE " . implode(' AND ', $whereClauses);
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    // Ambil data terbaru jika ada target id
    $updatedData = null;
    if ($targetId !== null) {
        $fetchStmt = $pdo->prepare("SELECT * FROM `$table` WHERE `id` = :id LIMIT 1");
        $fetchStmt->execute([':id' => $targetId]);
        $updatedData = $fetchStmt->fetch();
    }

    echo json_encode(['data' => $updatedData, 'error' => null]);
}

// ============================================================
// HANDLER: DELETE (DELETE)
// ============================================================
function handleDelete(PDO $pdo, string $table) {
    $whereClauses = [];
    $params = [];

    $targetId = $_GET['id'] ?? null;
    if ($targetId !== null) {
        $whereClauses[] = "`id` = :id";
        $params[':id'] = $targetId;
    }

    $specialKeys = ['table', 'select', 'order', 'limit', 'offset', 'or', 'single', '_method', 'id'];
    foreach ($_GET as $key => $val) {
        if (!in_array($key, $specialKeys, true) && preg_match('/^[a-zA-Z0-9_]+$/', $key)) {
            $whereClauses[] = "`$key` = :del_$key";
            $params[":del_$key"] = $val;
        }
    }

    if (empty($whereClauses)) {
        http_response_code(400);
        echo json_encode(['error' => 'Delete ditolak: tidak ada kriteria WHERE / id yang ditentukan.', 'data' => null]);
        return;
    }

    $sql = "DELETE FROM `$table` WHERE " . implode(' AND ', $whereClauses);
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    echo json_encode(['data' => true, 'error' => null]);
}
