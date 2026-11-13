import { describe, expect, test } from 'bun:test';
import { Command } from 'commander';
import { buildCommand, buildOption } from '@/cli/builder.ts';
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
  test('marks a required option mandatory', () => {
    const command = new Command('add').exitOverride().addOption(buildOption(language));

    expect(() => command.parse([], { from: 'user' })).toThrow(/required option .* not specified/);
    expect(() => command.parse(['-l', 'uk'], { from: 'user' })).not.toThrow();
  });

  test('parses a number option into a number', () => {
    const command = new Command()
      .addOption(buildOption({ name: 'engine-id', type: 'number', description: 'd' }))
      .exitOverride();

    expect(command.parse(['--engine-id', '-7'], { from: 'user' }).opts().engineId).toBe(-7);
  });

  test('collects a variadic number option across repeated flags', () => {
    const command = new Command()
      .addOption(buildOption({ name: 'bundle-id', type: 'number', variadic: true, description: 'd' }))
      .exitOverride();

    expect(command.parse(['--bundle-id', '1', '2', '--bundle-id', '3'], { from: 'user' }).opts().bundleId).toEqual([
      1, 2, 3,
    ]);
  });

  test('rejects options declared as conflicting, by their kebab-case names', () => {
    const command = new Command()
      .addOption(buildOption({ name: 'source-language', type: 'string', description: 'd', conflicts: ['dry-run'] }))
      .addOption(buildOption({ name: 'dry-run', type: 'boolean', description: 'd' }))
      .exitOverride()
      .configureOutput({ writeErr: () => undefined });

    expect(() => command.parse(['--source-language', 'en'], { from: 'user' })).not.toThrow();
    expect(() => command.parse(['--dry-run', '--source-language', 'en'], { from: 'user' })).toThrow(
      expect.objectContaining({ code: 'commander.conflictingOption' }),
    );
  });

  test.each(['abc', '1.5', '1e3', '0x10', ' 12 ', 'Infinity', ''])('rejects %p as a usage error', (value) => {
    const command = new Command()
      .addOption(buildOption({ name: 'engine-id', type: 'number', description: 'd' }))
      .exitOverride()
      .configureOutput({ writeErr: () => undefined });

    expect(() => command.parse(['--engine-id', value], { from: 'user' })).toThrow(
      expect.objectContaining({ code: 'commander.invalidArgument' }),
    );
  });
});

describe('buildCommand arguments', () => {
  const group = buildCommand({
    name: 'app',
    description: 'd',
    subcommands: [
      {
        name: 'methods',
        description: 'd',
        arguments: [
          { name: 'app', description: 'a' },
          { name: 'path', description: 'p', optional: true },
        ],
        action: async () => {},
      },
    ],
  });
  const methods = group.commands[0] as Command;

  test('renders an optional argument as [name] in usage and in the parent help', () => {
    expect(methods.usage()).toBe('<app> [path] [options]');
    expect(group.createHelp().subcommandTerm(methods)).toBe('methods <app> [path]');
    expect(methods.registeredArguments.map((arg) => arg.required)).toEqual([true, false]);
  });
});
