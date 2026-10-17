<?php

declare(strict_types=1);

require __DIR__ . '/../../src/auth.php';
require __DIR__ . '/../../src/stats.php';

require_admin();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    respond_json(405, ['ok' => false, 'error' => 'Methode nicht erlaubt.']);
}

$type = (string) ($_GET['type'] ?? '');

$files = [
    'contact' => __DIR__ . '/../messages.json',
    'project' => __DIR__ . '/../projects.json',
];

if (!isset($files[$type])) {
    respond_json(422, ['ok' => false, 'error' => 'Unbekannter Typ.']);
}

$records = load_records($files[$type]);

// Newest first.
usort($records, static function (array $a, array $b): int {
    return strcmp((string) ($b['createdAt'] ?? ''), (string) ($a['createdAt'] ?? ''));
});

respond_json(200, ['ok' => true, 'type' => $type, 'records' => $records]);
