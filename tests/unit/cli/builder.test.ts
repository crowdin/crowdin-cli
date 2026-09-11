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

describe('buildOption negation', () => {
  // The tri-state pattern: a positive flag plus a `--no-` sibling share one attribute, so the field
  // stays `undefined` unless one of them is passed and the request omits it entirely. That only
  // works because commander strips `no-` to derive the attribute name - if it did not, the sibling
  // would land on its own key and silently never reach the request.
  test.each([
    ['no-duplicate-translations', 'duplicateTranslations'],
    ['no-translate-with-perfect-match-only', 'translateWithPerfectMatchOnly'],
    ['no-preserve-hierarchy', 'preserveHierarchy'],
    ['no-auto-update', 'autoUpdate'],
    ['no-hidden', 'hidden'],
  ])('maps --%s onto %s, negated', (name, attribute) => {
    const option = buildOption({ name, type: 'boolean', description: 'd' });

    expect(option.attributeName()).toBe(attribute);
    expect(option.negate).toBe(true);
  });

  test('parses the pair into the tri-state the request builders read', () => {
    const command = new Command()
      .addOption(buildOption({ name: 'duplicate-translations', type: 'boolean', description: 'd' }))
      .addOption(buildOption({ name: 'no-duplicate-translations', type: 'boolean', description: 'd' }))
      .exitOverride();

    expect(command.parse([], { from: 'user' }).opts().duplicateTranslations).toBeUndefined();
    expect(command.parse(['--duplicate-translations'], { from: 'user' }).opts().duplicateTranslations).toBe(true);
    expect(command.parse(['--no-duplicate-translations'], { from: 'user' }).opts().duplicateTranslations).toBe(false);
  });
});

describe('buildOption', () => {
  test('marks a required option mandatory, as picocli does', () => {
    const command = new Command('add').exitOverride().addOption(buildOption(language));

    expect(() => command.parse([], { from: 'user' })).toThrow(/required option .* not specified/);
    expect(() => command.parse(['-l', 'uk'], { from: 'user' })).not.toThrow();
  });
});
