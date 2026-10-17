<?php

declare(strict_types=1);

/**
 * Wrap untrusted content (customer input, stored records) in a delimited
 * block so the model can be told to treat it strictly as data, never as
 * instructions.
 *
 * The closing tag inside the payload is escaped so the content cannot break
 * out of the block.
 */
function untrusted_block(string $source, string $content): string
{
    $source = preg_replace('/[^A-Za-z0-9_.-]/', '', $source) ?: 'data';
    $content = str_replace('</untrusted_data>', '<\\/untrusted_data>', $content);

    return "<untrusted_data source=\"{$source}\">\n{$content}\n</untrusted_data>";
}
