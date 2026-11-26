<?php
// ============================================================
// KONEKSI DATABASE MYSQL FOUNDIT! POLIBATAM (PBL PRO-13)
// ============================================================

$host = 'localhost';
$db   = 'foundit_pbl';
$user = 'root';

// Coba beberapa password umum (password user 010203, default Laragon kosong, atau root)
$possiblePasswords = ['010203', '', 'root'];
$pdo = null;
$lastError = null;

foreach ($possiblePasswords as $pass) {
    try {
        $dsn = "mysql:host={$host};dbname={$db};charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        $pdo = new PDO($dsn, $user, $pass, $options);
        if ($pdo) {
            break;
        }
    } catch (PDOException $e) {
        $lastError = $e->getMessage();
    }
}

if (!$pdo) {
    header('Content-Type: application/json; charset=utf-8');
    http_response_code(500);
    echo json_encode([
        'error' => 'Koneksi ke database MySQL gagal: ' . $lastError,
        'hint'  => 'Pastikan MySQL aktif di Laragon/XAMPP dan database `foundit_pbl` telah diimpor dari database_setup.sql'
    ]);
    exit;
}
