<?php

declare(strict_types=1);

/*
 * Basic contact form endpoint.
 *
 * Accepts POST requests as JSON or form-encoded data and appends the
 * submitted message to a JSON file (messages.json) acting as a tiny DB.
 */

header('Content-Type: application/json; charset=utf-8');

// --- CORS (mainly for the Vite dev server on a different origin) ------------
$allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/**
 * Send a JSON response and stop execution.
 */
function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'Methode nicht erlaubt.']);
}

// --- Read input -------------------------------------------------------------
$raw = file_get_contents('php://input');
$input = json_decode($raw ?: '', true);

if (!is_array($input)) {
    $input = $_POST;
}

$email   = trim((string) ($input['email'] ?? ''));
$phone   = trim((string) ($input['phone'] ?? ''));
$title   = trim((string) ($input['title'] ?? ''));
$message = trim((string) ($input['message'] ?? ''));

// --- Validation -------------------------------------------------------------
$errors = [];

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Bitte gib eine gültige E-Mail-Adresse an.';
} elseif (mb_strlen($email) > 254) {
    $errors['email'] = 'Die E-Mail-Adresse ist zu lang.';
}

if ($phone !== '' && !preg_match('/^[0-9+()\/\s.\-]{5,40}$/', $phone)) {
    $errors['phone'] = 'Bitte gib eine gültige Telefonnummer an.';
}

if ($title === '') {
    $errors['title'] = 'Bitte gib einen Titel an.';
} elseif (mb_strlen($title) > 150) {
    $errors['title'] = 'Der Titel ist zu lang (max. 150 Zeichen).';
}

if ($message === '') {
    $errors['message'] = 'Bitte gib eine Nachricht ein.';
} elseif (mb_strlen($message) > 5000) {
    $errors['message'] = 'Die Nachricht ist zu lang (max. 5000 Zeichen).';
}

if ($errors !== []) {
    respond(422, [
        'ok' => false,
        'error' => 'Bitte prüfe deine Eingaben.',
        'errors' => $errors,
    ]);
}

// --- Store ------------------------------------------------------------------
$storageFile = __DIR__ . '/messages.json';

$handle = @fopen($storageFile, 'c+');
if ($handle === false) {
    respond(500, ['ok' => false, 'error' => 'Speichern derzeit nicht möglich.']);
}

// Lock while reading + writing to avoid race conditions.
flock($handle, LOCK_EX);

$contents = stream_get_contents($handle);
$messages = json_decode($contents ?: '[]', true);
if (!is_array($messages)) {
    $messages = [];
}

$messages[] = [
    'id'        => bin2hex(random_bytes(8)),
    'email'     => $email,
    'phone'     => $phone,
    'title'     => $title,
    'message'   => $message,
    'createdAt' => date('c'),
    'ip'        => $_SERVER['REMOTE_ADDR'] ?? null,
];

ftruncate($handle, 0);
rewind($handle);
fwrite(
    $handle,
    json_encode(
        $messages,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    )
);
fflush($handle);
flock($handle, LOCK_UN);
fclose($handle);

respond(201, ['ok' => true, 'message' => 'Nachricht gespeichert.']);
