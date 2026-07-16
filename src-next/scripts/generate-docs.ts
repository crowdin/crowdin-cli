#!/usr/bin/env bun

/**
 * Generates the website command reference (website/docs/commands/*.md) from the
 * command definitions in src-next/cli/commands.ts — the same data the CLI runs on.
 * Hand-authored content (e.g. Examples) lives in website/docs-extras/<page>.md and
 * is appended verbatim to the matching generated page.
 *
 * Usage: bun run docs [--out <dir>]
 */

import type { ArgumentDef, CommandDef, OptionDef, OptionGroupDef, SubcommandDef } from '@/cli/types.ts';

export interface RootMeta {
  name: string;
  description: string;
}

export interface BuildPagesInput {
  root: RootMeta;
  commands: CommandDef[];
  globalOptions: OptionDef[];
  extras?: Record<string, string>;
}

const HELP_OPTION: OptionDef = {
  name: 'help',
  short: 'h',
  type: 'boolean',
  description: 'Display help message and exit',
};

const VERSION_OPTION: OptionDef = {
  name: 'version',
  short: 'V',
  type: 'boolean',
  description: 'Display version information and exit',
};

// `  ` before a newline is a markdown hard break, used for term/definition pairs.
const HB = '  ';

function isGroup(entry: OptionDef | OptionGroupDef): entry is OptionGroupDef {
  return 'group' in entry;
}

function ownOptions(options: (OptionDef | OptionGroupDef)[] = []): OptionDef[] {
  return options.filter((entry): entry is OptionDef => !isGroup(entry)).filter((opt) => !opt.hidden);
}

function optionGroups(options: (OptionDef | OptionGroupDef)[] = []): OptionGroupDef[] {
  return options.filter(isGroup);
}

function formatValue(value: unknown): string {
  return typeof value === 'string' ? `"${value}"` : String(value);
}

function optionLines(opt: OptionDef): string[] {
  const long = opt.type === 'boolean' ? `\`--${opt.name}\`` : `\`--${opt.name}\`=*…*`;
  const token = opt.short ? `\`-${opt.short}\`, ${long}` : long;

  let description = opt.description;
  if (opt.choices?.length) {
    description += ` (choices: ${opt.choices.map(formatValue).join(', ')})`;
  }
  if (opt.type !== 'boolean' && opt.default !== undefined) {
    description += ` (default: ${formatValue(opt.default)})`;
  }

  return [token + HB, description];
}

// The builder registers every argument as required (`<name>`), so the docs do too.
function argumentLines(arg: ArgumentDef): string[] {
  return [`*&lt;${arg.name}&gt;*${HB}`, arg.description];
}

function groupTitle(group: string): string {
  return group
    .replace(/:$/, '')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function synopsis(path: string[], node: { arguments?: ArgumentDef[]; subcommands?: SubcommandDef[] }): string {
  const parts = [...path];
  for (const arg of node.arguments ?? []) {
    parts.push(`<${arg.name}>`);
  }
  if (node.subcommands?.length) {
    parts.push('[SUBCOMMAND]');
  }
  parts.push('[OPTIONS]');
  return `    ${parts.join(' ')}`;
}

function optionsSection(title: string, options: OptionDef[]): string[] | undefined {
  if (!options.length) return undefined;
  return [`## ${title}`, '', ...options.flatMap((opt, i) => (i ? ['', ...optionLines(opt)] : optionLines(opt)))];
}

interface PageNode {
  path: string[];
  description: string;
  arguments?: ArgumentDef[];
  options?: (OptionDef | OptionGroupDef)[];
  subcommands?: SubcommandDef[];
}

function renderPage(node: PageNode, globalOptions: OptionDef[], isRoot: boolean): string {
  const groups = optionGroups(node.options);
  const sections: string[][] = [];

  sections.push([`# ${node.path.join(' ')}`]);
  sections.push(['## Description', '', ...node.description.split('\n')]);
  sections.push(['## Synopsis', '', synopsis(node.path, node)]);

  if (node.subcommands?.length) {
    const entries = node.subcommands.flatMap((sub, i) => {
      const link = [`[**${sub.name}**](${[...node.path, sub.name].join('-')})${HB}`, ...sub.description.split('\n')];
      return i ? ['', ...link] : link;
    });
    sections.push(['## Commands', '', ...entries]);
  }

  if (node.arguments?.length) {
    const entries = node.arguments.flatMap((arg, i) => (i ? ['', ...argumentLines(arg)] : argumentLines(arg)));
    sections.push(['## Arguments', '', ...entries]);
  }

  // The root program owns --version and the global options directly; every other
  // page gets --help plus a dedicated Global Options section, mirroring `--help` output.
  const options = isRoot
    ? [VERSION_OPTION, HELP_OPTION, ...globalOptions.filter((opt) => !opt.hidden)]
    : [...ownOptions(node.options), HELP_OPTION];

  const optionSections = [
    optionsSection('Options', options),
    ...groups.map((group) =>
      optionsSection(
        groupTitle(group.group),
        group.options.filter((opt) => !opt.hidden),
      ),
    ),
    isRoot
      ? undefined
      : optionsSection(
          'Global Options',
          globalOptions.filter((opt) => !opt.hidden),
        ),
  ];
  for (const section of optionSections) {
    if (section) sections.push(section);
  }

  return `${sections.map((lines) => lines.join('\n')).join('\n\n')}\n`;
}

function collectNodes(root: RootMeta, commands: CommandDef[]): PageNode[] {
  const nodes: PageNode[] = [
    {
      path: [root.name],
      description: root.description,
      subcommands: commands,
    },
  ];

  for (const command of commands) {
    nodes.push({ ...command, path: [root.name, command.name] });
    for (const sub of command.subcommands ?? []) {
      nodes.push({ ...sub, path: [root.name, command.name, sub.name] });
    }
  }

  return nodes;
}

function validate(nodes: PageNode[]): string[] {
  const problems: string[] = [];
  for (const node of nodes) {
    const id = node.path.join(' ');
    if (!node.description) {
      problems.push(`${id}: missing description`);
    }
    for (const arg of node.arguments ?? []) {
      if (!arg.description) problems.push(`${id}: argument <${arg.name}> is missing a description`);
    }
    const allOptions = (node.options ?? []).flatMap((entry) => (isGroup(entry) ? entry.options : [entry]));
    for (const opt of allOptions) {
      if (!opt.description && !opt.hidden) problems.push(`${id}: option --${opt.name} is missing a description`);
    }
  }
  return problems;
}

export function buildPages(input: BuildPagesInput): Map<string, string> {
  const { root, commands, globalOptions, extras = {} } = input;
  const nodes = collectNodes(root, commands);
  const problems = validate(nodes);

  const pages = new Map<string, string>();
  for (const node of nodes) {
    const file = `${node.path.join('-')}.md`;
    if (pages.has(file)) {
      problems.push(`${file}: multiple commands map to the same page`);
      continue;
    }
    pages.set(file, renderPage(node, globalOptions, node.path.length === 1));
  }

  for (const [file, snippet] of Object.entries(extras)) {
    const generated = pages.get(file);
    if (generated === undefined) {
      problems.push(`extras snippet ${file} does not match any generated page`);
      continue;
    }
    pages.set(file, `${generated}\n${snippet}`);
  }

  if (problems.length) {
    throw new Error(`Docs generation failed:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  }

  return pages;
}

async function main(): Promise<void> {
  const { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } = await import('node:fs');
  const path = await import('node:path');

  const { commands } = await import('@/cli/commands.ts');
  const { default: getGlobalOptions } = await import('@/cli/options.ts');
  const { name, description } = await import('@/cli/meta.ts');

  const repoRoot = path.resolve(import.meta.dir, '../..');
  const outIndex = process.argv.indexOf('--out');
  const outDir =
    outIndex === -1 ? path.join(repoRoot, 'website/docs/commands') : path.resolve(process.argv[outIndex + 1] ?? '');
  const extrasDir = path.join(repoRoot, 'website/docs-extras');

  const extras: Record<string, string> = {};
  if (existsSync(extrasDir)) {
    for (const file of readdirSync(extrasDir)
      .filter((f) => f.endsWith('.md'))
      .sort()) {
      extras[file] = readFileSync(path.join(extrasDir, file), 'utf8');
    }
  }

  const pages = buildPages({ root: { name, description }, commands, globalOptions: getGlobalOptions(), extras });

  mkdirSync(outDir, { recursive: true });
  for (const [file, content] of pages) {
    writeFileSync(path.join(outDir, file), content);
  }

  console.log(`Generated ${pages.size} pages in ${outDir}`);
}

if (import.meta.main) {
  await main();
}
