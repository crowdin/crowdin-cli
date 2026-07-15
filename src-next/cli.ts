#!/usr/bin/env bun

import tab from '@bomb.sh/tab/commander';
import { Command, CommanderError } from 'commander';
import { buildCommand, buildOption, getHelpConfig } from './cli/builder.ts';
import { commands } from './cli/commands.ts';
import CliError, { getExitCode } from './cli/errors/CliError.ts';
import colorHook from './cli/hooks/color.ts';
import { description, name, version } from './cli/meta.ts';
import getGlobalOptions from './cli/options.ts';
import { expandArgFiles } from './cli/utils/argFiles.ts';
import { checkNewVersion } from './cli/utils/checkVersion.ts';
import { createOutput, getOutputFormatFromArgs } from './cli/utils/output.ts';

function createProgram(): Command {
  const program = new Command();

  program
    .name(name)
    .usage('[command] [options]')
    .version(version, '-V, --version', 'Display version information and exit')
    .description(description)
    .helpOption('-h, --help', 'Display help message and exit')
    .configureHelp(getHelpConfig())
    // Report an unknown top-level command instead of commander's "too many arguments" (see builder.ts).
    .allowExcessArguments()
    .action(() => {
      if (program.args.length > 0) {
        program.error(`unknown command '${program.args[0]}'`, { exitCode: 1, code: 'commander.unknownCommand' });
      }

      program.help();
    });

  for (const opt of getGlobalOptions()) {
    program.addOption(buildOption(opt));
  }

  program.hook('preAction', async (_thisCommand, actionCommand) => {
    colorHook(actionCommand);
  });

  for (const def of commands) {
    program.addCommand(buildCommand(def));
  }

  // Register shell completion: adds a `complete` subcommand and mirrors the whole command/option
  // tree (including choices) for zsh/bash/fish/powershell. Must run after all commands are added.
  tab(program);

  // Make commander throw CommanderError instead of calling process.exit itself, so the
  // top-level catch owns the exit code. Applied recursively because a parse error on a
  // subcommand (e.g. `crowdin file upload --bad`) is thrown in the subcommand's context.
  applyExitOverride(program);

  return program;
}

function applyExitOverride(command: Command): void {
  command.exitOverride();

  for (const sub of command.commands) {
    applyExitOverride(sub);
  }
}

async function main(argv: string[]) {
  const program = createProgram();
  await program.parseAsync(argv);
}

// Completion requests fire on every TAB keystroke: skip @arg-file expansion (a partial token isn't a
// file) and the network version check, and keep the raw args intact for the completion protocol.
const rawArgs = process.argv.slice(2);
const isCompletion = rawArgs[0] === 'complete';

// Expand picocli-style @arg-files before commander sees the arguments.
const argv = [...process.argv.slice(0, 2), ...(isCompletion ? rawArgs : expandArgFiles(rawArgs))];

try {
  await main(argv);
  // Mirror Java Cli.main: after a successful real command, check for a newer release. Help, version,
  // empty args and parse errors all throw CommanderError and land in catch, so they skip the check.
  if (!isCompletion) {
    await checkNewVersion(createOutput(getOutputFormatFromArgs(argv)), version);
  }
} catch (error) {
  // Commander already wrote its own output (help/version to stdout, usage errors to stderr),
  // so don't reprint. Mirror Java/picocli: help & version exit 0, usage errors exit 2.
  if (error instanceof CommanderError) {
    process.exitCode = error.exitCode === 0 ? 0 : 2;
  } else {
    const globalOptions = getOutputFormatFromArgs(argv);
    const output = createOutput(globalOptions);
    const message = error instanceof Error ? error.message : String(error);

    if (globalOptions.debug && error instanceof Error && error.stack) {
      // --debug: print the full stack trace (message included) instead of the one-liner.
      // ponytail: top-level only; per-file worker-thread stacks stay deferred with upload/download.
      console.error(error.stack);
    } else if (!(error instanceof CliError && error.reported)) {
      output.error(message);
    }

    process.exitCode = getExitCode(error);
  }
}
