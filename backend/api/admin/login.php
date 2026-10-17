<?php

declare(strict_types=1);

require __DIR__ . '/../../src/auth.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond_json(405, ['ok' => false, 'error' => 'Methode nicht erlaubt.']);
}

$input = read_request_body();

$email = trim((string) ($input['email'] ?? ''));
$password = (string) ($input['password'] ?? '');

$credentials = admin_credentials();

if ($credentials === null) {
    respond_json(500, ['ok' => false, 'error' => 'Admin-Zugang ist nicht konfiguriert.']);
}

$emailMatches = strcasecmp($email, $credentials['email']) === 0;
$passwordMatches = hash_equals($credentials['password'], $password);

if ($email === '' || $password === '' || !$emailMatches || !$passwordMatches) {
    respond_json(401, ['ok' => false, 'error' => 'Ungültige Zugangsdaten.']);
}

start_admin_session();
session_regenerate_id(true);
$_SESSION['admin_email'] = $credentials['email'];

respond_json(200, ['ok' => true, 'email' => $credentials['email']]);
