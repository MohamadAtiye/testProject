<?php

declare(strict_types=1);

require __DIR__ . '/../../src/auth.php';
require __DIR__ . '/../../src/llm.php';
require __DIR__ . '/../../src/prompts.php';
require __DIR__ . '/../../src/tools.php';
require __DIR__ . '/../../src/untrusted.php';

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

    // Client-supplied system messages are never trusted; the system prompt is
    // owned solely by the server and prepended below.
    if (!in_array($role, ['user', 'assistant'], true) || $content === '') {
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

// The system prompt always comes from the server prompt modules, regardless of
// what the client sent. The current date is appended so relative questions
// ("today", "this week") can be turned into tool filters. It only changes once
// per day, so prompt-prefix caching within a day is unaffected.
$systemPrompt = build_system_prompt(admin_prompt_modules())
    . "\n\n---\n\n# Aktuelles Datum\n\nHeute ist " . date('Y-m-d') . " (" . date('l') . ")."
    . " Beziehe \"heute\" und \"diese Woche\" auf dieses Datum.";

array_unshift($clean, [
    'role' => 'system',
    'content' => $systemPrompt,
]);

/**
 * Run one whitelisted tool call and return its result as an untrusted-data
 * block the model is instructed to treat as data only.
 *
 * @param array<string, mixed> $call
 */
function run_tool_call(array $call): string
{
    $name = (string) ($call['function']['name'] ?? '');

    if (!in_array($name, admin_tool_names(), true)) {
        return 'Fehler: unbekanntes Werkzeug.';
    }

    $rawArgs = $call['function']['arguments'] ?? '{}';
    if (is_array($rawArgs)) {
        $args = $rawArgs;
    } else {
        $decoded = json_decode((string) $rawArgs, true);
        $args = is_array($decoded) ? $decoded : [];
    }

    try {
        $payload = execute_admin_tool($name, $args);
    } catch (Throwable $exception) {
        return 'Fehler: Daten konnten nicht gelesen werden.';
    }

    return untrusted_block(
        $name,
        (string) json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
    );
}

$tools = admin_tools();
$maxIterations = 4;
$reply = '';

try {
    for ($iteration = 0; $iteration < $maxIterations; $iteration++) {
        $message = llm_request($clean, [
            'tools' => $tools,
            'max_tokens' => 700,
            'temperature' => 0.4,
        ]);

        if ($message['tool_calls'] === []) {
            $reply = trim($message['content']);
            break;
        }

        // Echo the assistant's tool request back into the conversation.
        $clean[] = [
            'role' => 'assistant',
            'content' => $message['content'],
            'tool_calls' => $message['tool_calls'],
        ];

        foreach ($message['tool_calls'] as $call) {
            if (!is_array($call)) {
                continue;
            }

            $callId = is_string($call['id'] ?? null) ? $call['id'] : '';

            $clean[] = [
                'role' => 'tool',
                'tool_call_id' => $callId,
                'content' => run_tool_call($call),
            ];
        }
    }

    // If the loop hit its limit while the model was still calling tools, force
    // a final answer without tools.
    if ($reply === '') {
        $reply = trim(llm_request($clean, ['max_tokens' => 700, 'temperature' => 0.4])['content']);
    }
} catch (RuntimeException $exception) {
    respond_json(502, ['ok' => false, 'error' => $exception->getMessage()]);
}

if ($reply === '') {
    respond_json(502, ['ok' => false, 'error' => 'Keine Antwort erhalten.']);
}

respond_json(200, ['ok' => true, 'reply' => $reply]);
