import { describe, expect, test } from 'bun:test';
import type { CommandDef, OptionDef } from '@/cli/types.ts';
import { buildPages } from '@/scripts/generate-docs.ts';

const root = { name: 'crowdin', description: 'Root description' };

const globalOptions: OptionDef[] = [
  { name: 'verbose', short: 'v', type: 'boolean', description: 'Provide more information about command execution' },
  { name: 'output', short: 'o', type: 'string', description: 'Change output format', choices: ['json', 'plain'] },
];

const branch: CommandDef = {
  name: 'branch',
  description: 'Manage branches in a Crowdin project',
  subcommands: [
    {
      name: 'add',
      description: 'Create a new branch',
      arguments: [{ name: 'name', description: 'Branch name', required: true }],
      options: [
        { name: 'title', type: 'string', description: 'Provide more details for translators' },
        { name: 'priority', type: 'string', description: 'Defines priority level', choices: ['low', 'high'] },
        { name: 'secret', type: 'string', description: 'Internal', hidden: true },
        {
          group: 'Config options:',
          options: [
            { name: 'token', short: 'T', type: 'string', description: 'Personal access token' },
            { name: 'base-url', type: 'string', description: 'Base URL', default: 'https://api.crowdin.com' },
          ],
        },
      ],
    },
  ],
};

// `  ` at the end of a line is a markdown hard break (kept explicit via HB).
const HB = '  ';

function page(lines: string[]): string {
  return `${lines.join('\n')}\n`;
}

function build(commands: CommandDef[], extras: Record<string, string> = {}) {
  return buildPages({ root, commands, globalOptions, extras });
}

describe('buildPages', () => {
  test('renders a subcommand page with arguments, options, groups and global options', () => {
    const pages = build([branch]);

    expect(pages.get('crowdin-branch-add.md')).toBe(
      page([
        '# crowdin branch add',
        '',
        '## Description',
        '',
        'Create a new branch',
        '',
        '## Synopsis',
        '',
        '    crowdin branch add <name> [CONFIG OPTIONS] [OPTIONS]',
        '',
        '## Arguments',
        '',
        `*&lt;name&gt;*${HB}`,
        'Branch name',
        '',
        '## Options',
        '',
        `\`--title\`=*…*${HB}`,
        'Provide more details for translators',
        '',
        `\`--priority\`=*…*${HB}`,
        'Defines priority level (choices: "low", "high")',
        '',
        `\`-h\`, \`--help\`${HB}`,
        'Display help message and exit',
        '',
        '## Config Options',
        '',
        `\`-T\`, \`--token\`=*…*${HB}`,
        'Personal access token',
        '',
        `\`--base-url\`=*…*${HB}`,
        'Base URL (default: "https://api.crowdin.com")',
        '',
        '## Global Options',
        '',
        `\`-v\`, \`--verbose\`${HB}`,
        'Provide more information about command execution',
        '',
        `\`-o\`, \`--output\`=*…*${HB}`,
        'Change output format (choices: "json", "plain")',
      ]),
    );
  });

  test('renders a parent command page with a linked Commands section', () => {
    const pages = build([branch]);

    expect(pages.get('crowdin-branch.md')).toBe(
      page([
        '# crowdin branch',
        '',
        '## Description',
        '',
        'Manage branches in a Crowdin project',
        '',
        '## Synopsis',
        '',
        '    crowdin branch [SUBCOMMAND] [OPTIONS]',
        '',
        '## Commands',
        '',
        `[**add**](crowdin-branch-add)${HB}`,
        'Create a new branch',
        '',
        '## Options',
        '',
        `\`-h\`, \`--help\`${HB}`,
        'Display help message and exit',
        '',
        '## Global Options',
        '',
        `\`-v\`, \`--verbose\`${HB}`,
        'Provide more information about command execution',
        '',
        `\`-o\`, \`--output\`=*…*${HB}`,
        'Change output format (choices: "json", "plain")',
      ]),
    );
  });

  test('renders the root page with version option and global options inline', () => {
    const pages = build([branch]);

    expect(pages.get('crowdin.md')).toBe(
      page([
        '# crowdin',
        '',
        '## Description',
        '',
        'Root description',
        '',
        '## Synopsis',
        '',
        '    crowdin [SUBCOMMAND] [OPTIONS]',
        '',
        '## Commands',
        '',
        `[**branch**](crowdin-branch)${HB}`,
        'Manage branches in a Crowdin project',
        '',
        '## Options',
        '',
        `\`-V\`, \`--version\`${HB}`,
        'Display version information and exit',
        '',
        `\`-h\`, \`--help\`${HB}`,
        'Display help message and exit',
        '',
        `\`-v\`, \`--verbose\`${HB}`,
        'Provide more information about command execution',
        '',
        `\`-o\`, \`--output\`=*…*${HB}`,
        'Change output format (choices: "json", "plain")',
      ]),
    );
  });

  test('appends a matching extras snippet at the end of the page', () => {
    const pages = build([branch], {
      'crowdin-branch-add.md': '## Examples\n\n    crowdin branch add main\n',
    });

    const content = pages.get('crowdin-branch-add.md') ?? '';
    expect(content.endsWith('\n## Examples\n\n    crowdin branch add main\n')).toBe(true);
    expect(content).toContain('## Global Options');
  });

  // The builder registers every argument as required (`<name>`, builder.ts), so the
  // docs render them the same way regardless of the unused `required` field.
  test('renders every argument as required, mirroring the builder', () => {
    const demo: CommandDef = {
      name: 'demo',
      description: 'Demo command',
      arguments: [
        { name: 'file', description: 'The file' },
        { name: 'rest', description: 'Extra files' },
      ],
    };

    const content = build([demo]).get('crowdin-demo.md') ?? '';
    expect(content).toContain('    crowdin demo <file> <rest> [OPTIONS]');
    expect(content).toContain(`*&lt;file&gt;*${HB}\nThe file`);
    expect(content).toContain(`*&lt;rest&gt;*${HB}\nExtra files`);
  });

  test('throws when an extras snippet does not match any generated page', () => {
    expect(() => build([branch], { 'crowdin-nope.md': '## Examples\n' })).toThrow('crowdin-nope.md');
  });

  test('throws when a command is missing a description', () => {
    const bad: CommandDef = { name: 'bad', description: '' };
    expect(() => build([bad])).toThrow('bad');
  });
});
