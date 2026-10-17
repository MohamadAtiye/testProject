<?php

declare(strict_types=1);

require_once __DIR__ . '/env.php';

load_env(dirname(__DIR__) . '/.env');

/**
 * @return array{base_url: string, model: string, timeout: int}
 */
function llm_config(): array
{
    return [
        'base_url' => rtrim((string) env('AI_BASE_URL', 'http://127.0.0.1:8080'), '/'),
        'model' => (string) env('AI_MODEL', 'local'),
        'timeout' => (int) env('AI_TIMEOUT', '60'),
    ];
}

/**
 * Send a chat completion to the local (OpenAI-compatible) model server and
 * return the raw assistant message, including any tool calls.
 *
 * @param array<int, array<string, mixed>> $messages
 * @param array{temperature?: float, max_tokens?: int, json?: bool, thinking?: bool, tools?: array<int, array<string, mixed>>, tool_choice?: string} $options
 * @return array{role: string, content: string, tool_calls: array<int, array<string, mixed>>}
 * @throws RuntimeException when the model is unreachable or returns an error.
 */
function llm_request(array $messages, array $options = []): array
{
    $config = llm_config();

    $payload = [
        'model' => $config['model'],
        'messages' => array_values($messages),
        'temperature' => $options['temperature'] ?? 0.5,
        'max_tokens' => $options['max_tokens'] ?? 512,
        'stream' => false,
        // Qwen models: disable the hidden "thinking" so we get clean answers.
        'chat_template_kwargs' => [
            'enable_thinking' => $options['thinking'] ?? false,
        ],
    ];

    if (!empty($options['json'])) {
        $payload['response_format'] = ['type' => 'json_object'];
    }

    if (!empty($options['tools'])) {
        $payload['tools'] = array_values($options['tools']);
        $payload['tool_choice'] = $options['tool_choice'] ?? 'auto';
    }

    $handle = curl_init($config['base_url'] . '/v1/chat/completions');
    curl_setopt_array($handle, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_TIMEOUT => $config['timeout'],
        CURLOPT_CONNECTTIMEOUT => 5,
    ]);

    $response = curl_exec($handle);
    $status = curl_getinfo($handle, CURLINFO_HTTP_CODE);
    $error = curl_error($handle);

    if ($response === false) {
        throw new RuntimeException('Modell nicht erreichbar (' . $error . ').');
    }

    if ($status < 200 || $status >= 300) {
        throw new RuntimeException('Modell-Fehler (HTTP ' . $status . ').');
    }

    $data = json_decode($response, true);
    $message = $data['choices'][0]['message'] ?? null;

    if (!is_array($message)) {
        throw new RuntimeException('Unerwartete Antwort vom Modell.');
    }

    $content = $message['content'] ?? '';
    $toolCalls = $message['tool_calls'] ?? null;

    return [
        'role' => 'assistant',
        'content' => is_string($content) ? $content : '',
        'tool_calls' => is_array($toolCalls) ? array_values($toolCalls) : [],
    ];
}

/**
 * Convenience wrapper for plain (tool-less) completions.
 *
 * @param array<int, array<string, mixed>> $messages
 * @param array<string, mixed> $options
 */
function llm_chat(array $messages, array $options = []): string
{
    return trim(llm_request($messages, $options)['content']);
}
