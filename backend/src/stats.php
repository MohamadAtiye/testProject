<?php

declare(strict_types=1);

/**
 * Load a JSON array of records from a file. Returns [] when missing/invalid.
 */
function load_records(string $file): array
{
    if (!is_file($file)) {
        return [];
    }

    $contents = file_get_contents($file);
    $items = json_decode($contents ?: '[]', true);

    return is_array($items) ? $items : [];
}

/**
 * Count records created today and in the current (Monday-based) week.
 *
 * @return array{today: int, week: int, total: int}
 */
function count_records(array $records, ?int $now = null): array
{
    $now ??= time();
    $today = date('Y-m-d', $now);
    $weekStart = strtotime('monday this week', $now);

    $todayCount = 0;
    $weekCount = 0;

    foreach ($records as $record) {
        $created = $record['createdAt'] ?? null;
        if (!is_string($created)) {
            continue;
        }

        $timestamp = strtotime($created);
        if ($timestamp === false) {
            continue;
        }

        if (date('Y-m-d', $timestamp) === $today) {
            $todayCount++;
        }

        if ($weekStart !== false && $timestamp >= $weekStart && $timestamp <= $now) {
            $weekCount++;
        }
    }

    return [
        'today' => $todayCount,
        'week' => $weekCount,
        'total' => count($records),
    ];
}
