#!/usr/bin/env bun

import tab from '@bomb.sh/tab/commander';
import { Command, CommanderError } from 'commander';
import { buildCommand, buildOption, getHelpConfig } from './cli/builder.ts';
import { commands } from './cli/commands.ts';
import CliError, { getExitCode } from './cli/errors/CliError.ts';
import { description, name, version } from './cli/meta.ts';
import getGlobalOptions from './cli/options.ts';
import { expandArgFiles } from './cli/utils/argFiles.ts';
import { checkNewVersion } from './cli/utils/checkVersion.ts';
import { isStructuredFormat } from './cli/utils/formatter.ts';
import { createOutput, getOutputFormatFromArgs } from './cli/utils/output.ts';

function createProgram(quietErrors: boolean): Command {
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

  // Under json/toon the catch below re-emits the usage error as a diagnostic record, so commander's
  // own prose (the 'error: …' line plus the usage hint that follows it) would land on the same
  // stderr stream and break the one-record-per-line contract.
  if (quietErrors) {
    applyQuietErrors(program);
  }

  return program;
}

function applyExitOverride(command: Command): void {
  command.exitOverride();

  for (const sub of command.commands) {
    applyExitOverride(sub);
  }
}

function applyQuietErrors(command: Command): void {
  command.configureOutput({ writeErr: () => {} });

  for (const sub of command.commands) {
    applyQuietErrors(sub);
  }
}

async function main(argv: string[], quietErrors: boolean) {
  const program = createProgram(quietErrors);
  await program.parseAsync(argv);
}

// Completion requests fire on every TAB keystroke: skip @arg-file expansion (a partial token isn't a
// file) and the network version check, and keep the raw args intact for the completion protocol.
const rawArgs = process.argv.slice(2);
const isCompletion = rawArgs[0] === 'complete';
// Expand picocli-style @arg-files before commander sees the arguments.
const argv = [...process.argv.slice(0, 2), ...(isCompletion ? rawArgs : expandArgFiles(rawArgs))];
const globalOptions = getOutputFormatFromArgs(argv);
const isStructured = isStructuredFormat(globalOptions.output);

try {
  await main(argv, isStructured);
  // Mirror Java Cli.main: after a successful real command, check for a newer release. Help, version,
  // empty args and parse errors all throw CommanderError and land in catch, so they skip the check.
  if (!isCompletion) {
    await checkNewVersion(createOutput(globalOptions), version);
  }
} catch (error) {
  // Commander already wrote its own output (help/version to stdout, usage errors to stderr),
  // so don't reprint. Mirror Java/picocli: help & version exit 0, usage errors exit 2.
  if (error instanceof CommanderError) {
    process.exitCode = error.exitCode === 0 ? 0 : 2;

    // A usage error is a diagnostic like any other: json/toon get the record their consumer parses,
    // in place of the prose applyQuietErrors suppressed. commander prefixes its own messages with
    // 'error: ', which the record's `level` already carries.
    if (isStructured && error.exitCode !== 0) {
      createOutput(globalOptions).error(error.message.replace(/^error: /, ''), { code: 2 });
    }
  } else {
    const output = createOutput(globalOptions);
    const message = error instanceof Error ? error.message : String(error);
    const exitCode = getExitCode(error);

    if (globalOptions.debug && error instanceof Error && error.stack) {
      // --debug: print the full stack trace (message included) instead of the one-liner.
      // ponytail: top-level only; per-file worker-thread stacks stay deferred with upload/download.
      console.error(error.stack);
    } else if (!(error instanceof CliError && error.reported)) {
      output.error(message, { code: exitCode });
    }

    process.exitCode = exitCode;
  }
}
