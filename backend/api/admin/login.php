<?php

declare(strict_types=1);

require __DIR__ . '/../../src/auth.php';

header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Methode nicht erlaubt.']);
    exit;
}

$raw = file_get_contents('php://input');
$input = json_decode($raw ?: '', true);
if (!is_array($input)) {
    $input = $_POST;
}

$email = trim((string) ($input['email'] ?? ''));
$password = (string) ($input['password'] ?? '');

$credentials = admin_credentials();

if ($credentials === null) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Admin-Zugang ist nicht konfiguriert.']);
    exit;
}

$emailMatches = strcasecmp($email, $credentials['email']) === 0;
$passwordMatches = hash_equals($credentials['password'], $password);

if ($email === '' || $password === '' || !$emailMatches || !$passwordMatches) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Ungültige Zugangsdaten.']);
    exit;
}

start_admin_session();
session_regenerate_id(true);
$_SESSION['admin_email'] = $credentials['email'];

echo json_encode(['ok' => true, 'email' => $credentials['email']]);
