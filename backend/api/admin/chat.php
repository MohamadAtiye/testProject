<?php

declare(strict_types=1);

require __DIR__ . '/../../src/auth.php';
require __DIR__ . '/../../src/llm.php';
require __DIR__ . '/../../src/prompts.php';

require_admin();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond_json(405, ['ok' => false, 'error' => 'Methode nicht erlaubt.']);
}

$input = read_request_body();
$messages = $input['messages'] ?? null;

if (!is_array($messages) || $messages === []) {
    respond_json(422, ['ok' => false, 'error' => 'Keine Nachricht übermittelt.']);
}

$clean = [];
foreach ($messages as $message) {
    if (!is_array($message)) {
        continue;
    }

    $role = (string) ($message['role'] ?? '');
    $content = trim((string) ($message['content'] ?? ''));

    if (!in_array($role, ['system', 'user', 'assistant'], true) || $content === '') {
        continue;
    }

    $clean[] = ['role' => $role, 'content' => mb_substr($content, 0, 4000)];
}

if ($clean === []) {
    respond_json(422, ['ok' => false, 'error' => 'Keine gültige Nachricht.']);
}

// Keep only the most recent turns to stay within context.
if (count($clean) > 20) {
    $clean = array_slice($clean, -20);
}

// Ensure the assistant has a role/persona from the prompt modules.
if (($clean[0]['role'] ?? '') !== 'system') {
    array_unshift($clean, [
        'role' => 'system',
        'content' => build_system_prompt(),
    ]);
}

try {
    $reply = llm_chat($clean, ['max_tokens' => 512, 'temperature' => 0.5]);
} catch (RuntimeException $exception) {
    respond_json(502, ['ok' => false, 'error' => $exception->getMessage()]);
}

respond_json(200, ['ok' => true, 'reply' => $reply]);
