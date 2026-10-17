<?php

declare(strict_types=1);

/*
 * Basic contact form endpoint.
 *
 * Accepts POST requests as JSON or form-encoded data and appends the
 * submitted message to a JSON file (messages.json) acting as a tiny DB.
 */

require __DIR__ . '/../src/http.php';
require __DIR__ . '/../src/storage.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond_json(405, ['ok' => false, 'error' => 'Methode nicht erlaubt.']);
}

$input = read_request_body();

$email = trim((string) ($input['email'] ?? ''));
$phone = trim((string) ($input['phone'] ?? ''));
$title = trim((string) ($input['title'] ?? ''));
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
    respond_json(422, [
        'ok' => false,
        'error' => 'Bitte prüfe deine Eingaben.',
        'errors' => $errors,
    ]);
}

// --- Store ------------------------------------------------------------------
$record = [
    'id' => bin2hex(random_bytes(8)),
    'email' => $email,
    'phone' => $phone,
    'title' => $title,
    'message' => $message,
    'createdAt' => date('c'),
    'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
];

try {
    append_json_record(__DIR__ . '/messages.json', $record);
} catch (RuntimeException $exception) {
    respond_json(500, ['ok' => false, 'error' => 'Speichern derzeit nicht möglich.']);
}

respond_json(201, ['ok' => true, 'message' => 'Nachricht gespeichert.']);
