<?php

try {
    
    $pdo = new PDO("mysql:host=localhost;dbname=mailercloud;charset=utf8mb4", "root", "");
} catch (\PDOException $e) {
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed: ' . $e->getMessage()
    ]);
    exit;
}
