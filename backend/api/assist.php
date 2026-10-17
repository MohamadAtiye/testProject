<?php

declare(strict_types=1);

/*
 * Public project-form assist endpoint.
 *
 * Unauthenticated by design, but it has ZERO data access: it never reads
 * messages.json / projects.json and registers no tools. It only receives the
 * visitor's own form draft (whitelisted, length-capped fields), wraps it as
 * untrusted data, and asks the local model for structured suggestions.
 *
 * Contact details are intentionally NOT accepted here (data minimization).
 *
 * Triggered by the frontend on a debounce; rate-limited per client IP.
 */

require __DIR__ . '/../src/http.php';
require __DIR__ . '/../src/env.php';
require __DIR__ . '/../src/llm.php';
require __DIR__ . '/../src/prompts.php';
require __DIR__ . '/../src/rate_limit.php';
require __DIR__ . '/../src/untrusted.php';

load_env(dirname(__DIR__) . '/.env');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond_json(405, ['ok' => false, 'error' => 'Methode nicht erlaubt.']);
}

// --- Abuse control -----------------------------------------------------------
$limit = (int) (env('ASSIST_RATE_LIMIT') ?? '20');
$window = (int) (env('ASSIST_RATE_WINDOW') ?? '60');

if (!rate_limit('assist:' . client_ip(), $limit, $window)) {
    respond_json(429, ['ok' => false, 'error' => 'Zu viele Anfragen. Bitte kurz warten.']);
}

// --- Whitelist the draft (never trust extra fields) --------------------------
$input = read_request_body();
$draft = [];

$service = trim((string) ($input['service'] ?? ''));
if (in_array($service, ['design', 'systems', 'consulting', 'mix'], true)) {
    $draft['service'] = $service;
}

$engagement = trim((string) ($input['engagement'] ?? ''));
if (in_array($engagement, ['project', 'longterm'], true)) {
    $draft['engagement'] = $engagement;
}

$goal = trim((string) ($input['goal'] ?? ''));
if ($goal !== '') {
    $draft['goal'] = mb_substr($goal, 0, 5000);
}

if (isset($input['timeline']) && is_array($input['timeline'])) {
    $kind = trim((string) ($input['timeline']['kind'] ?? ''));
    if (in_array($kind, ['fixed', 'flexible', 'asap'], true)) {
        $timeline = ['kind' => $kind];
        $date = trim((string) ($input['timeline']['date'] ?? ''));
        if ($kind === 'fixed' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $timeline['date'] = $date;
        }
        $draft['timeline'] = $timeline;
    }
}

if (isset($input['budget']) && is_array($input['budget'])) {
    $unknown = ($input['budget']['unknown'] ?? false) === true;
    $range = trim((string) ($input['budget']['range'] ?? ''));
    if ($unknown) {
        $draft['budget'] = ['unknown' => true];
    } elseif ($range !== '' && mb_strlen($range) <= 40) {
        $draft['budget'] = ['range' => $range, 'unknown' => false];
    }
}

if (!isset($draft['goal']) && !isset($draft['service'])) {
    respond_json(422, ['ok' => false, 'error' => 'Keine Eingaben übermittelt.']);
}

// --- Server-owned prompt; draft is data, not instructions --------------------
$messages = [
    ['role' => 'system', 'content' => build_system_prompt(['assist'])],
    [
        'role' => 'user',
        'content' => untrusted_block(
            'project_draft',
            (string) json_encode($draft, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
        ),
    ],
];

try {
    $raw = llm_chat($messages, ['max_tokens' => 400, 'temperature' => 0.3, 'json' => true]);
} catch (RuntimeException $exception) {
    respond_json(502, ['ok' => false, 'error' => $exception->getMessage()]);
}

$data = json_decode($raw, true);
if (!is_array($data)) {
    respond_json(502, ['ok' => false, 'error' => 'Unerwartete Antwort.']);
}

// --- Normalize output --------------------------------------------------------
$suggestions = [];
foreach ((array) ($data['suggestions'] ?? []) as $suggestion) {
    if (is_string($suggestion) && trim($suggestion) !== '') {
        $suggestions[] = mb_substr(trim($suggestion), 0, 300);
    }
}

$missing = [];
foreach ((array) ($data['missing'] ?? []) as $field) {
    if (in_array($field, ['service', 'engagement', 'goal', 'timeline', 'budget'], true)) {
        $missing[] = $field;
    }
}

respond_json(200, [
    'ok' => true,
    'summary' => mb_substr(trim((string) ($data['summary'] ?? '')), 0, 200),
    'suggestions' => array_slice($suggestions, 0, 5),
    'missing' => array_values(array_unique($missing)),
]);
