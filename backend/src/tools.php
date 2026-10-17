<?php

declare(strict_types=1);

require_once __DIR__ . '/stats.php';

/**
 * Read-only admin tools. The model may only request these names; PHP owns the
 * actual file access and validates every argument. Never dispatch a
 * model-supplied string to a filesystem path.
 *
 * @return array<int, array<string, mixed>>
 */
function admin_tools(): array
{
    return [
        [
            'type' => 'function',
            'function' => [
                'name' => 'read_contact_messages',
                'description' => 'Liest allgemeine Kontaktanfragen (messages.json). Neueste zuerst.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'since' => [
                            'type' => 'string',
                            'description' => 'Optional: nur Anfragen ab diesem Datum (YYYY-MM-DD).',
                        ],
                        'limit' => [
                            'type' => 'integer',
                            'description' => 'Optional: maximale Anzahl (1-50), Standard 20.',
                        ],
                    ],
                    'additionalProperties' => false,
                ],
            ],
        ],
        [
            'type' => 'function',
            'function' => [
                'name' => 'read_project_requests',
                'description' => 'Liest Projektanfragen (projects.json). Neueste zuerst.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'since' => [
                            'type' => 'string',
                            'description' => 'Optional: nur Anfragen ab diesem Datum (YYYY-MM-DD).',
                        ],
                        'service' => [
                            'type' => 'string',
                            'enum' => ['design', 'systems', 'consulting', 'mix'],
                        ],
                        'status' => [
                            'type' => 'string',
                            'description' => 'Optional: Bearbeitungsstand, z. B. "new".',
                        ],
                        'limit' => [
                            'type' => 'integer',
                            'description' => 'Optional: maximale Anzahl (1-50), Standard 20.',
                        ],
                    ],
                    'additionalProperties' => false,
                ],
            ],
        ],
    ];
}

/**
 * The set of tool names the model is allowed to call. Anything else is refused.
 *
 * @return string[]
 */
function admin_tool_names(): array
{
    return ['read_contact_messages', 'read_project_requests'];
}

function admin_data_files(): array
{
    return [
        'contact' => dirname(__DIR__) . '/api/messages.json',
        'project' => dirname(__DIR__) . '/api/projects.json',
    ];
}

/**
 * Execute one whitelisted, read-only tool and return its data payload.
 *
 * @param array<string, mixed> $args
 * @return array<string, mixed>
 * @throws InvalidArgumentException on an unknown tool name.
 */
function execute_admin_tool(string $name, array $args): array
{
    $files = admin_data_files();

    $limit = (int) ($args['limit'] ?? 20);
    $limit = max(1, min(50, $limit));

    $since = null;
    if (isset($args['since']) && is_string($args['since']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $args['since'])) {
        $parsed = strtotime($args['since'] . ' 00:00:00');
        if ($parsed !== false) {
            $since = $parsed;
        }
    }

    if ($name === 'read_contact_messages') {
        return read_admin_records($files['contact'], $since, $limit, 'contact');
    }

    if ($name === 'read_project_requests') {
        $service = null;
        if (isset($args['service']) && in_array($args['service'], ['design', 'systems', 'consulting', 'mix'], true)) {
            $service = (string) $args['service'];
        }

        $status = null;
        if (isset($args['status']) && is_string($args['status']) && $args['status'] !== '') {
            $status = mb_substr($args['status'], 0, 40);
        }

        return read_admin_records($files['project'], $since, $limit, 'project', $service, $status);
    }

    throw new InvalidArgumentException('Unbekanntes Werkzeug.');
}

/**
 * Load, filter (deterministically, server-side), sort newest-first, and cap a
 * record set. The model never filters; it only asks.
 *
 * @return array<string, mixed>
 */
function read_admin_records(
    string $file,
    ?int $since,
    int $limit,
    string $type,
    ?string $service = null,
    ?string $status = null
): array {
    $records = load_records($file);

    $filtered = [];
    foreach ($records as $record) {
        if (!is_array($record)) {
            continue;
        }

        if ($since !== null) {
            $timestamp = strtotime((string) ($record['createdAt'] ?? ''));
            if ($timestamp === false || $timestamp < $since) {
                continue;
            }
        }

        if ($service !== null && ($record['service'] ?? null) !== $service) {
            continue;
        }

        if ($status !== null && ($record['status'] ?? null) !== $status) {
            continue;
        }

        $filtered[] = $record;
    }

    usort(
        $filtered,
        static fn (array $a, array $b): int => strcmp(
            (string) ($b['createdAt'] ?? ''),
            (string) ($a['createdAt'] ?? '')
        )
    );

    return [
        'type' => $type,
        'total' => count($filtered),
        'returned' => min($limit, count($filtered)),
        'records' => array_slice($filtered, 0, $limit),
    ];
}
