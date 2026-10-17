<?php

declare(strict_types=1);

require __DIR__ . '/../../src/auth.php';

$email = current_admin();

if ($email === null) {
    respond_json(401, ['ok' => false, 'error' => 'Nicht angemeldet.']);
}

respond_json(200, ['ok' => true, 'email' => $email]);
