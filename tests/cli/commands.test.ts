import { describe, expect, test } from 'bun:test';
import { commands } from '@/cli/commands.ts';

describe('command registry', () => {
  test('registers expected top-level commands with unique names', () => {
    const names = commands.map((command) => command.name);

    expect(names).toEqual(['upload', 'download', 'init', 'status', 'task', 'file', 'language', 'comment', 'config', 'project', 'distribution', 'test']);
    expect(new Set(names).size).toBe(names.length);
  });

  test('keeps command aliases and key subcommands', () => {
    const upload = commands.find((command) => command.name === 'upload');
    const download = commands.find((command) => command.name === 'download');
    const status = commands.find((command) => command.name === 'status');
    const language = commands.find((command) => command.name === 'language');
    const task = commands.find((command) => command.name === 'task');
    const config = commands.find((command) => command.name === 'config');

    expect(upload?.alias).toBe('push');
    expect(upload?.subcommands?.map((subcommand) => subcommand.name)).toEqual(['sources', 'translations']);

    expect(download?.alias).toBe('pull');
    expect(download?.subcommands?.map((subcommand) => subcommand.name)).toEqual(['sources', 'translations']);

    expect(status?.subcommands?.map((subcommand) => subcommand.name)).toEqual(['translation', 'proofreading']);
    expect(task?.subcommands?.map((subcommand) => subcommand.name)).toEqual(['list', 'add']);
    expect(language?.subcommands?.map((subcommand) => subcommand.name)).toEqual(['list']);
    expect(config?.subcommands?.map((subcommand) => subcommand.name)).toEqual(['sources', 'translations', 'lint']);
  });
});
