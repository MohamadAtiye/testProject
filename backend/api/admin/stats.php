<?php

declare(strict_types=1);

require __DIR__ . '/../../src/auth.php';
require __DIR__ . '/../../src/stats.php';

require_admin();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond_json(405, ['ok' => false, 'error' => 'Methode nicht erlaubt.']);
}

respond_json(200, [
    'ok' => true,
    'generatedAt' => date('c'),
    'contact' => count_records(load_records(__DIR__ . '/../messages.json')),
    'project' => count_records(load_records(__DIR__ . '/../projects.json')),
]);
