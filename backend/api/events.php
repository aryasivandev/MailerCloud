<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method Not Allowed']);
    exit;
}

require_once __DIR__ . '/../config/database.php';
global $pdo;

$data = json_decode(file_get_contents("php://input"), true);

// Payload validation
if (
    empty($data['event_id']) || 
    empty($data['campaign_id']) || 
    empty($data['type']) || 
    empty($data['timestamp'])
) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Missing required fields']);
    exit;
}

$event_id = trim($data['event_id']);
$campaign_id = trim($data['campaign_id']);
$type = trim($data['type']);
$allowed_types = ['sent', 'opened', 'clicked', 'bounced'];

if (!in_array($type, $allowed_types)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid event type. Must be one of: sent, opened, clicked, bounced']);
    exit;
}

$timestamp_raw = strtotime($data['timestamp']);
if ($timestamp_raw === false) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid ISO 8601 timestamp format']);
    exit;
}
$timestamp = date('Y-m-d H:i:s', $timestamp_raw);

// Begin transaction
$pdo->beginTransaction();

try {
    // 1. Insert event (Duplicate key prevention using UNIQUE event_id)
    $stmt = $pdo->prepare("
        INSERT IGNORE INTO events (event_id, campaign_id, event_type, event_timestamp) 
        VALUES (:event_id, :campaign_id, :type, :timestamp)
    ");
    
    $stmt->execute([
        ':event_id' => $event_id,
        ':campaign_id' => $campaign_id,
        ':type' => $type,
        ':timestamp' => $timestamp
    ]);
    
    $affected_events = $stmt->rowCount();

    // 2. Update campaign_stats counters atomically only if the event_id is new
    if ($affected_events > 0) {
        $stmt2 = $pdo->prepare("
            INSERT INTO campaign_stats (campaign_id, sent_count, opened_count, clicked_count, bounced_count)
            VALUES (:campaign_id, 
                IF(:type1 = 'sent', 1, 0), 
                IF(:type2 = 'opened', 1, 0), 
                IF(:type3 = 'clicked', 1, 0), 
                IF(:type4 = 'bounced', 1, 0)
            )
            ON DUPLICATE KEY UPDATE
                sent_count = sent_count + IF(:type5 = 'sent', 1, 0),
                opened_count = opened_count + IF(:type6 = 'opened', 1, 0),
                clicked_count = clicked_count + IF(:type7 = 'clicked', 1, 0),
                bounced_count = bounced_count + IF(:type8 = 'bounced', 1, 0),
                updated_at = CURRENT_TIMESTAMP
        ");
        
        $stmt2->execute([
            ':campaign_id' => $campaign_id,
            ':type1' => $type, ':type2' => $type, ':type3' => $type, ':type4' => $type,
            ':type5' => $type, ':type6' => $type, ':type7' => $type, ':type8' => $type
        ]);
    }

    $pdo->commit();

    echo json_encode([
        'success' => true,
        'duplicate' => ($affected_events === 0)
    ]);

} catch (\Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Ingestion transaction failed: ' . $e->getMessage()
    ]);
}