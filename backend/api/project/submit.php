<?php

declare(strict_types=1);

require __DIR__ . '/../../src/http.php';
require __DIR__ . '/../../src/storage.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond_json(405, ['ok' => false, 'error' => 'Methode nicht erlaubt.']);
}

$input = read_request_body();

$service = trim((string) ($input['service'] ?? ''));
$engagement = trim((string) ($input['engagement'] ?? ''));
$goal = trim((string) ($input['goal'] ?? ''));
$contact = as_array($input['contact'] ?? null);
$consent = ($input['consent'] ?? false) === true;

$name = trim((string) ($contact['name'] ?? ''));
$company = trim((string) ($contact['company'] ?? ''));
$email = trim((string) ($contact['email'] ?? ''));
$phone = trim((string) ($contact['phone'] ?? ''));

// --- Validation -------------------------------------------------------------
$errors = [];

if (!in_array($service, ['design', 'systems', 'consulting', 'mix'], true)) {
    $errors['service'] = 'Bitte wähle eine Leistung.';
}

if (!in_array($engagement, ['project', 'longterm'], true)) {
    $errors['engagement'] = 'Bitte wähle die Art der Zusammenarbeit.';
}

if ($goal === '') {
    $errors['goal'] = 'Bitte beschreibe dein Vorhaben.';
} elseif (mb_strlen($goal) < 15) {
    $errors['goal'] = 'Bitte beschreibe dein Vorhaben etwas genauer.';
} elseif (mb_strlen($goal) > 5000) {
    $errors['goal'] = 'Die Beschreibung ist zu lang (max. 5000 Zeichen).';
}

if ($name === '') {
    $errors['contact.name'] = 'Bitte gib deinen Namen an.';
}
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['contact.email'] = 'Bitte gib eine gültige E-Mail-Adresse an.';
}
if ($phone !== '' && !preg_match('/^[0-9+()\/\s.\-]{5,40}$/', $phone)) {
    $errors['contact.phone'] = 'Bitte gib eine gültige Telefonnummer an.';
}

if (!$consent) {
    $errors['consent'] = 'Bitte stimme der Verarbeitung deiner Daten zu.';
}

// Optional: timeline ----------------------------------------------------------
$timeline = null;
if (isset($input['timeline']) && is_array($input['timeline'])) {
    $kind = trim((string) ($input['timeline']['kind'] ?? ''));
    $date = trim((string) ($input['timeline']['date'] ?? ''));

    if ($kind !== '') {
        if (!in_array($kind, ['fixed', 'flexible', 'asap'], true)) {
            $errors['timeline.kind'] = 'Ungültige Zeitangabe.';
        } elseif ($kind === 'fixed' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $errors['timeline.date'] = 'Bitte gib ein gültiges Datum an.';
        }

        $timeline = [
            'kind' => $kind,
            'date' => $kind === 'fixed' ? $date : null,
        ];
    }
}

// Optional: budget ------------------------------------------------------------
$budget = null;
if (isset($input['budget']) && is_array($input['budget'])) {
    $unknown = ($input['budget']['unknown'] ?? false) === true;
    $range = trim((string) ($input['budget']['range'] ?? ''));

    if ($unknown) {
        $budget = ['range' => null, 'unknown' => true];
    } elseif ($range !== '') {
        if (mb_strlen($range) > 40) {
            $errors['budget.range'] = 'Ungültige Budgetangabe.';
        }
        $budget = ['range' => $range, 'unknown' => false];
    }
}

if ($errors !== []) {
    respond_json(422, [
        'ok' => false,
        'error' => 'Bitte prüfe deine Eingaben.',
        'errors' => $errors,
    ]);
}

// --- Store -------------------------------------------------------------------
$record = [
    'id' => bin2hex(random_bytes(8)),
    'service' => $service,
    'engagement' => $engagement,
    'goal' => $goal,
    'timeline' => $timeline,
    'budget' => $budget,
    'contact' => [
        'name' => $name,
        'company' => $company,
        'email' => $email,
        'phone' => $phone,
    ],
    'consent' => true,
    'status' => 'new',
    'createdAt' => date('c'),
    'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
];

try {
    append_json_record(__DIR__ . '/../projects.json', $record);
} catch (RuntimeException $exception) {
    respond_json(500, ['ok' => false, 'error' => 'Speichern derzeit nicht möglich.']);
}

respond_json(201, ['ok' => true, 'id' => $record['id']]);
