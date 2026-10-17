<?php

declare(strict_types=1);

/*
 * Health check endpoint.
 *
 * Returns a small JSON payload describing the API status. Useful for uptime
 * monitors and load balancers probing the backend.
 */

header('Content-Type: application/json; charset=utf-8');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'GET' && $method !== 'HEAD') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Methode nicht erlaubt.'], JSON_UNESCAPED_UNICODE);
    exit;
}

$storageFile = __DIR__ . '/messages.json';

$storageWritable = is_file($storageFile)
    ? is_writable($storageFile)
    : is_writable(__DIR__);

$healthy = $storageWritable;

http_response_code($healthy ? 200 : 503);

echo json_encode(
    [
        'ok' => $healthy,
        'status' => $healthy ? 'healthy' : 'degraded',
        'time' => date('c'),
        'php' => PHP_VERSION,
        'storage' => $storageWritable ? 'writable' : 'not_writable',
    ],
    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
);
