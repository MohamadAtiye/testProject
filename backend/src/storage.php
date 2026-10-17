<?php

declare(strict_types=1);

/**
 * Append a record to a JSON array stored in a file, using an exclusive lock
 * so concurrent requests cannot corrupt the file.
 *
 * @throws RuntimeException when the file cannot be opened or written.
 */
function append_json_record(string $file, array $record): void
{
    $handle = @fopen($file, 'c+');
    if ($handle === false) {
        throw new RuntimeException('Speicherdatei konnte nicht geöffnet werden.');
    }

    try {
        if (!flock($handle, LOCK_EX)) {
            throw new RuntimeException('Speicherdatei konnte nicht gesperrt werden.');
        }

        $contents = stream_get_contents($handle);
        $items = json_decode($contents ?: '[]', true);
        if (!is_array($items)) {
            $items = [];
        }

        $items[] = $record;

        ftruncate($handle, 0);
        rewind($handle);
        fwrite(
            $handle,
            json_encode($items, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
        );
        fflush($handle);
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}
