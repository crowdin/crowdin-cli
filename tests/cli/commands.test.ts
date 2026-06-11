import { describe, expect, test } from 'bun:test';
import { commands } from '@/cli/commands.ts';

describe('command registry', () => {
  test('registers expected top-level commands with unique names', () => {
    const names = commands.map((command) => command.name);

    expect(names).toEqual([
      'upload',
      'download',
      'app',
      'bundle',
      'screenshot',
      'init',
      'status',
      'string',
      'task',
      'file',
      'language',
      'label',
      'comment',
      'config',
      'project',
      'distribution',
      'context',
      'tm',
    ]);
    expect(new Set(names).size).toBe(names.length);
  });

  test('keeps command aliases and key subcommands', () => {
    const upload = commands.find((command) => command.name === 'upload');
    const download = commands.find((command) => command.name === 'download');
    const bundle = commands.find((command) => command.name === 'bundle');
    const status = commands.find((command) => command.name === 'status');
    const screenshot = commands.find((command) => command.name === 'screenshot');
    const string = commands.find((command) => command.name === 'string');
    const language = commands.find((command) => command.name === 'language');
    const label = commands.find((command) => command.name === 'label');
    const task = commands.find((command) => command.name === 'task');
    const config = commands.find((command) => command.name === 'config');
    const context = commands.find((command) => command.name === 'context');
    const tm = commands.find((command) => command.name === 'tm');

    expect(upload?.alias).toBe('push');
    expect(upload?.subcommands?.map((subcommand) => subcommand.name)).toEqual(['sources', 'translations']);

    expect(download?.alias).toBe('pull');
    expect(download?.subcommands?.map((subcommand) => subcommand.name)).toEqual(['sources', 'translations']);

    expect(bundle?.subcommands?.map((subcommand) => subcommand.name)).toEqual([
      'list',
      'add',
      'delete',
      'download',
      'clone',
      'browse',
    ]);
    expect(screenshot?.subcommands?.map((subcommand) => subcommand.name)).toEqual(['list', 'upload', 'delete']);
    expect(status?.subcommands?.map((subcommand) => subcommand.name)).toEqual(['translation', 'proofreading']);
    expect(string?.subcommands?.map((subcommand) => subcommand.name)).toEqual(['list', 'add', 'delete', 'edit']);
    expect(task?.subcommands?.map((subcommand) => subcommand.name)).toEqual(['list', 'add']);
    expect(language?.subcommands?.map((subcommand) => subcommand.name)).toEqual(['list']);
    expect(label?.subcommands?.map((subcommand) => subcommand.name)).toEqual(['list', 'add', 'delete']);
    expect(config?.subcommands?.map((subcommand) => subcommand.name)).toEqual(['sources', 'translations', 'lint']);
    expect(context?.subcommands?.map((subcommand) => subcommand.name)).toEqual([
      'download',
      'upload',
      'reset',
      'status',
    ]);
    expect(tm?.subcommands?.map((subcommand) => subcommand.name)).toEqual(['list', 'download', 'upload']);
  });
});
