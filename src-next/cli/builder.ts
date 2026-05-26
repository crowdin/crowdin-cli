import { Command, Option } from 'commander';
import getGlobalOptions from './options.ts';
import type { CommandDef, OptionDef, OptionGroupDef } from './types.ts';
import { colors } from './utils/colors.ts';

export function getHelpConfig() {
  return {
    styleTitle: (str: string) => colors.bold(str),
    styleCommandText: (str: string) => colors.cyan(str),
    styleOptionText: (str: string) => {
      if (str.startsWith('--')) {
        return ' '.repeat(4) + colors.green(str);
      }

      return colors.green(str);
    },
    styleArgumentText: (str: string) => colors.yellow(str),
    styleSubcommandText: (str: string) => colors.cyan(str),
    subcommandTerm: (cmd: Command) => {
      const args = cmd.registeredArguments.map((arg) => `<${arg.name()}>`).join(' ');
      const alias = cmd.alias();

      return cmd.name() + (alias ? `, ${alias}` : '') + (args ? ` ${args}` : '');
    },
  };
}

export function buildCommand(def: CommandDef): Command {
  const cmd = new Command(def.name);

  cmd.description(def.description);
  cmd.helpOption('-h, --help', 'Display help message and exit');
  cmd.configureHelp(getHelpConfig());

  if (def.alias) {
    cmd.alias(def.alias);
  }

  for (const item of def.options ?? []) {
    if (isOptionGroup(item)) {
      cmd.optionsGroup(item.group);

      item.options.forEach((opt: OptionDef) => {
        cmd.addOption(buildOption(opt))
      });
    } else {
      cmd.addOption(buildOption(item));
    }
  }

  cmd.optionsGroup('Global options:');
  for (const opt of getGlobalOptions()) {
    cmd.addOption(buildOption(opt));
  }

  def.arguments?.forEach((arg) => {
    cmd.argument(`<${arg.name}>`, arg.description, arg?.default);
  });

  if (def.action) {
    cmd.action(async (...args: unknown[]) => {
      const command = args[args.length - 1] as Command;

      await def.action?.(command);
    });
  }

  def.subcommands?.forEach((sub) => {
    cmd.addCommand(buildCommand(sub));
  });

  return cmd;
}

function isOptionGroup(item: OptionDef | OptionGroupDef): item is OptionGroupDef {
  return 'group' in item;
}

export function buildOption(opt: OptionDef): Option {
  let flags = opt.short ? `-${opt.short}, --${opt.name}` : `--${opt.name}`;

  if (opt.type === 'string' || opt.type === 'number') {
    if (opt.variadic) {
      flags += ` <${opt.name}...>`;
    } else {
      flags += ` <${opt.name}>`;
    }
  }

  const option = new Option(flags, opt.description);

  if (opt.default !== undefined) {
    option.default(opt.default);
  }

  if (opt.choices) {
    option.choices(opt.choices);
  }

  if (opt.hidden) {
    option.hideHelp();
  }

  return option;
}
