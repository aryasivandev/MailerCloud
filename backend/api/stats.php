<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

require_once __DIR__ . '/../config/database.php';
global $pdo;

$id = isset($_GET['id']) ? trim($_GET['id']) : '';

if (empty($id)) {

    echo json_encode(['success' => false, 'message' => 'Campaign ID is required']);
    exit;
}

try {
   
    $stmt = $pdo->prepare("
        SELECT sent_count, opened_count, clicked_count, bounced_count 
        FROM campaign_stats 
        WHERE campaign_id = :id
    ");
    $stmt->execute([':id' => $id]);
    $row = $stmt->fetch();

    if ($row) {
        echo json_encode([
            'sent' => (int)$row['sent_count'],
            'opened' => (int)$row['opened_count'],
            'clicked' => (int)$row['clicked_count'],
            'bounced' => (int)$row['bounced_count']
        ]);
    } else {
        echo json_encode([
            'sent' => 0,
            'opened' => 0,
            'clicked' => 0,
            'bounced' => 0
        ]);
    }

} catch (\Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Failed to retrieve stats: ' . $e->getMessage()
    ]);
}
