<?php

declare(strict_types=1);

require_once __DIR__ . '/env.php';

load_env(dirname(__DIR__) . '/.env');

const PROMPT_SEPARATOR = "\n\n---\n\n";

function prompt_dir(): string
{
    return dirname(__DIR__) . '/prompts';
}

/**
 * Load a prompt fragment by name (without extension) from backend/prompts.
 * Returns "" when the file does not exist.
 */
function load_prompt(string $name): string
{
    $file = prompt_dir() . '/' . basename($name) . '.md';

    if (!is_file($file)) {
        return '';
    }

    $content = file_get_contents($file);

    return $content === false ? '' : trim($content);
}

/**
 * Resolve a comma-separated prompt-module list from an env var, falling back
 * to the given defaults when unset or empty.
 *
 * @param string[] $default
 * @return string[]
 */
function prompt_modules(string $envKey, array $default): array
{
    $configured = (string) env($envKey, implode(',', $default));
    $names = array_values(array_filter(array_map('trim', explode(',', $configured))));

    return $names !== [] ? $names : $default;
}

/**
 * Default modules used when build_system_prompt() is called without a list.
 * Configurable via AI_PROMPTS.
 *
 * @return string[]
 */
function system_prompt_modules(): array
{
    return prompt_modules('AI_PROMPTS', ['persona', 'domain']);
}

/**
 * Modules for the admin chat. Configurable via AI_ADMIN_PROMPTS.
 *
 * @return string[]
 */
function admin_prompt_modules(): array
{
    return prompt_modules('AI_ADMIN_PROMPTS', ['persona', 'domain', 'admin']);
}

/**
 * Modules for the public form-assist endpoint. Configurable via
 * AI_ASSIST_PROMPTS.
 *
 * @return string[]
 */
function assist_prompt_modules(): array
{
    return prompt_modules('AI_ASSIST_PROMPTS', ['assist', 'assist_goals']);
}

/**
 * Compose a system prompt from the given prompt modules, joined with a rule.
 *
 * @param string[]|null $names Defaults to AI_PROMPTS / persona+domain.
 */
function build_system_prompt(?array $names = null): string
{
    $names ??= system_prompt_modules();

    $parts = [];
    foreach ($names as $name) {
        $content = load_prompt($name);
        if ($content !== '') {
            $parts[] = $content;
        }
    }

    return implode(PROMPT_SEPARATOR, $parts);
}
