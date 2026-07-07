#!/usr/bin/env bun

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
    .action(() => program.help());

  for (const opt of getGlobalOptions()) {
    program.addOption(buildOption(opt));
  }

  program.hook('preAction', async (_thisCommand, actionCommand) => {
    colorHook(actionCommand);
  });

  for (const def of commands) {
    program.addCommand(buildCommand(def));
  }

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

// Expand picocli-style @arg-files before commander sees the arguments.
const argv = [...process.argv.slice(0, 2), ...expandArgFiles(process.argv.slice(2))];

try {
  await main(argv);
  // Mirror Java Cli.main: after a successful real command, check for a newer release. Help, version,
  // empty args and parse errors all throw CommanderError and land in catch, so they skip the check.
  await checkNewVersion(createOutput(getOutputFormatFromArgs(argv)), version);
} catch (error) {
  // Commander already wrote its own output (help/version to stdout, usage errors to stderr),
  // so don't reprint. Mirror Java/picocli: help & version exit 0, usage errors exit 2.
  if (error instanceof CommanderError) {
    process.exitCode = error.exitCode === 0 ? 0 : 2;
  } else {
    const output = createOutput(getOutputFormatFromArgs(argv));
    const message = error instanceof Error ? error.message : String(error);

    if (!(error instanceof CliError && error.reported)) {
      output.error(message);
    }

    process.exitCode = getExitCode(error);
  }
}
