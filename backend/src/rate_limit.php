<?php

declare(strict_types=1);

/**
 * Best-effort client IP for rate limiting. Uses REMOTE_ADDR only, never
 * client-supplied headers such as X-Forwarded-For (those are spoofable
 * unless set by a trusted reverse proxy).
 */
function client_ip(): string
{
    return (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
}

/**
 * Sliding-window rate limiter shared across requests via a locked JSON file.
 *
 * @param string $key            Bucket key (e.g. "assist:1.2.3.4").
 * @param int    $limit          Max hits allowed within the window.
 * @param int    $windowSeconds  Window length in seconds.
 * @return bool True when the request is allowed, false when the limit is hit.
 *
 * Fails open (returns true) when the store cannot be used, so a broken temp
 * dir never takes the feature down. Rate limiting is abuse control, not an
 * authorization boundary.
 */
function rate_limit(string $key, int $limit, int $windowSeconds): bool
{
    if ($limit <= 0 || $windowSeconds <= 0) {
        return true;
    }

    $file = sys_get_temp_dir() . '/stadtloewe_rate_limit.json';

    $handle = @fopen($file, 'c+');
    if ($handle === false) {
        return true;
    }

    try {
        if (!flock($handle, LOCK_EX)) {
            return true;
        }

        $contents = stream_get_contents($handle);
        $data = json_decode($contents ?: '[]', true);
        if (!is_array($data)) {
            $data = [];
        }

        $now = time();
        $cutoff = $now - $windowSeconds;

        $prune = static function (array $timestamps) use ($cutoff): array {
            $kept = [];
            foreach ($timestamps as $timestamp) {
                if (is_int($timestamp) && $timestamp > $cutoff) {
                    $kept[] = $timestamp;
                }
            }

            return $kept;
        };

        $hits = $prune((array) ($data[$key] ?? []));
        $allowed = count($hits) < $limit;

        if ($allowed) {
            $hits[] = $now;
        }
        $data[$key] = $hits;

        // Drop stale buckets so the file cannot grow without bound.
        foreach ($data as $bucket => $timestamps) {
            if ($bucket === $key) {
                continue;
            }
            $kept = $prune((array) $timestamps);
            if ($kept === []) {
                unset($data[$bucket]);
            } else {
                $data[$bucket] = $kept;
            }
        }

        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, json_encode($data));
        fflush($handle);

        return $allowed;
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}
