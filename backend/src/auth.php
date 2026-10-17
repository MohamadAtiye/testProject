<?php

declare(strict_types=1);

require_once __DIR__ . '/env.php';

load_env(dirname(__DIR__) . '/.env');

/**
 * Start (once) the admin session with a dedicated cookie name.
 */
function start_admin_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    session_name('stadtloewe_admin');
    session_start();
}

/**
 * Admin credentials, read strictly from the environment (.env).
 * Returns null when not configured, so authentication fails closed.
 *
 * @return array{email: string, password: string}|null
 */
function admin_credentials(): ?array
{
    $email = env('ADMIN_EMAIL');
    $password = env('ADMIN_PASSWORD');

    if ($email === null || $email === '' || $password === null || $password === '') {
        return null;
    }

    return ['email' => $email, 'password' => $password];
}

function current_admin(): ?string
{
    start_admin_session();
    $email = $_SESSION['admin_email'] ?? null;

    return is_string($email) ? $email : null;
}

function is_admin_authenticated(): bool
{
    return current_admin() !== null;
}

/**
 * Guard for admin-only endpoints: responds 401 and exits when not logged in.
 */
function require_admin(): string
{
    $email = current_admin();
    if ($email !== null) {
        return $email;
    }

    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => 'Nicht angemeldet.']);

    exit;
}
