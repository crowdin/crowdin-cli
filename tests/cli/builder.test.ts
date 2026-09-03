import { describe, expect, test } from 'bun:test';
import { Command } from 'commander';
import { buildOption } from '@/cli/builder.ts';
import type { OptionDef } from '@/cli/types.ts';

const language: OptionDef = {
  name: 'language',
  short: 'l',
  type: 'string',
  variadic: true,
  required: true,
  description: 'Target language identifier',
};

describe('buildOption', () => {
  test('marks a required option mandatory, as picocli does', () => {
    const command = new Command('add').exitOverride().addOption(buildOption(language));

    expect(() => command.parse([], { from: 'user' })).toThrow(/required option .* not specified/);
    expect(() => command.parse(['-l', 'uk'], { from: 'user' })).not.toThrow();
  });
});
