import { describe, expect, test } from 'bun:test';
import { commands } from '@/cli/commands.ts';
import type { CommandDef, OptionDef, OptionGroupDef, SubcommandDef } from '@/cli/types.ts';

const CONFIG_GROUP = 'Config options:';

// Option-name sets per Java picocli param tier (BaseParams -> ProjectParams -> ParamsWithFiles).
const BASE_TIER = ['token', 'base-url', 'base-path'];
const PROJECT_TIER = [...BASE_TIER, 'project-id'];
const FILES_TIER = [...PROJECT_TIER, 'source', 'translation', 'destination', 'no-preserve-hierarchy'];

const TIER_OPTIONS: Record<'base' | 'project' | 'files', string[]> = {
  base: BASE_TIER,
  project: PROJECT_TIER,
  files: FILES_TIER,
};

// Expected config tier for every registered command. `init` has its own options and is excluded.
// A new command without an entry here fails `assigns a config tier to every command`.
const COMMAND_TIER: Record<string, 'base' | 'project' | 'files'> = {
  upload: 'files',
  download: 'files',
  'auto-translate': 'files',
  config: 'files',
  app: 'project',
  branch: 'project',
  bundle: 'project',
  comment: 'project',
  context: 'project',
  distribution: 'project',
  file: 'project',
  language: 'project',
  project: 'project',
  screenshot: 'project',
  status: 'project',
  string: 'project',
  task: 'project',
  label: 'project',
  glossary: 'base',
  tm: 'base',
};

const COMMANDS_WITHOUT_CONFIG = new Set(['init']);

// Parents whose own action performs a real operation (not a `command.help()` shim), so they carry
// the config group themselves in addition to their subcommands.
const REAL_ACTION_PARENTS = new Set(['upload', 'download', 'status']);

function configGroupOptionNames(options: (OptionDef | OptionGroupDef)[] | undefined): string[] | undefined {
  const group = options?.find((option): option is OptionGroupDef => 'group' in option && option.group === CONFIG_GROUP);

  return group?.options.map((option) => option.name);
}

// Every node (subcommand, or leaf/real-action parent) that must expose the config group.
function configBearingNodes(command: CommandDef): Array<{ label: string; options?: (OptionDef | OptionGroupDef)[] }> {
  const nodes: Array<{ label: string; options?: (OptionDef | OptionGroupDef)[] }> = [];

  if (command.subcommands?.length) {
    for (const subcommand of command.subcommands as SubcommandDef[]) {
      nodes.push({ label: `${command.name} ${subcommand.name}`, options: subcommand.options });
    }

    if (REAL_ACTION_PARENTS.has(command.name)) {
      nodes.push({ label: command.name, options: command.options });
    }
  } else {
    nodes.push({ label: command.name, options: command.options });
  }

  return nodes;
}

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
      'auto-translate',
      'string',
      'task',
      'file',
      'branch',
      'language',
      'label',
      'comment',
      'config',
      'project',
      'distribution',
      'context',
      'tm',
      'glossary',
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
    const glossary = commands.find((command) => command.name === 'glossary');

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
    expect(glossary?.subcommands?.map((subcommand) => subcommand.name)).toEqual(['list', 'download', 'upload']);
  });
});

describe('config option groups', () => {
  test('assigns a config tier to every command (except init)', () => {
    for (const command of commands) {
      if (COMMANDS_WITHOUT_CONFIG.has(command.name)) {
        continue;
      }

      expect(COMMAND_TIER[command.name], `command '${command.name}' is missing a config tier`).toBeDefined();
    }
  });

  test('exposes the expected config option group on every config-bearing node', () => {
    for (const command of commands) {
      if (COMMANDS_WITHOUT_CONFIG.has(command.name)) {
        continue;
      }

      const tier = COMMAND_TIER[command.name];

      if (!tier) {
        throw new Error(`command '${command.name}' is missing a config tier`);
      }

      const expected = TIER_OPTIONS[tier];

      for (const node of configBearingNodes(command)) {
        expect(configGroupOptionNames(node.options), `'${node.label}' is missing its config option group`).toEqual(
          expected,
        );
      }
    }
  });

  test('does not attach a config group to init', () => {
    const init = commands.find((command) => command.name === 'init');

    expect(init).toBeDefined();
    expect(configGroupOptionNames(init?.options)).toBeUndefined();

    for (const subcommand of init?.subcommands ?? []) {
      expect(configGroupOptionNames(subcommand.options)).toBeUndefined();
    }
  });
});
