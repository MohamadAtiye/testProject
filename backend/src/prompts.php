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
 * The list of prompt modules used by default, from AI_PROMPTS
 * (comma-separated) or the built-in fallback.
 *
 * @return string[]
 */
function system_prompt_modules(): array
{
    $configured = (string) env('AI_PROMPTS', 'persona,domain');
    $names = array_values(array_filter(array_map('trim', explode(',', $configured))));

    return $names !== [] ? $names : ['persona', 'domain'];
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
