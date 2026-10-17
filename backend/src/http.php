<?php

declare(strict_types=1);

/**
 * Send a JSON response and stop execution.
 */
function respond_json(int $status, array $payload): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    exit;
}

/**
 * Read the request payload as an array (JSON body or form-encoded).
 */
function read_request_body(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '', true);

    if (is_array($data)) {
        return $data;
    }

    return $_POST;
}

/**
 * @return array<string, mixed>
 */
function as_array(mixed $value): array
{
    return is_array($value) ? $value : [];
}
