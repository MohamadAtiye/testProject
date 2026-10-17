<?php

declare(strict_types=1);

require __DIR__ . '/../../src/auth.php';

header('Content-Type: application/json; charset=utf-8');

$email = current_admin();

if ($email === null) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Nicht angemeldet.']);
    exit;
}

echo json_encode(['ok' => true, 'email' => $email]);
