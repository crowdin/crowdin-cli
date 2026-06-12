#!/usr/bin/env bun

import { Command } from 'commander';
import { buildCommand, buildOption, getHelpConfig } from './cli/builder.ts';
import { commands } from './cli/commands.ts';
import CliError from './cli/errors/CliError.ts';
import colorHook from './cli/hooks/color.ts';
import getGlobalOptions, { type GlobalOptions } from './cli/options.ts';
import { createOutput } from './cli/utils/output.ts';

const name = 'crowdin';
const version = '5.0.0';
const description = `Crowdin CLI is a command-line tool that allows you to manage and synchronize 
localization resources with your Crowdin project.
Visit the official documentation for more details: https://crowdin.github.io/crowdin-cli`;

function createProgram(): Command {
  const program = new Command();

  program
    .name(name)
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

  return program;
}

async function main() {
  const program = createProgram();
  await program.parseAsync(process.argv);
}

try {
  await main();
} catch (error) {
  const output = createOutput(getOutputFormat(process.argv));
  const message = error instanceof Error ? error.message : String(error);

  if (!(error instanceof CliError && error.reported)) {
    output.error(message);
  }

  process.exitCode = getExitCode(error);
}

function getExitCode(error: unknown): number {
  if (error instanceof CliError) {
    return error.exitCode;
  }

  if (typeof error === 'object' && error !== null && 'exitCode' in error) {
    const exitCode = (error as { exitCode?: unknown }).exitCode;

    if (typeof exitCode === 'number') {
      return exitCode;
    }
  }

  return 1;
}

function getOutputFormat(argv: string[]): GlobalOptions {
  let outputFormat = 'text';

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    if (arg === '--output' || arg === '-o') {
      const value = argv[index + 1];

      if (value === 'json' || value === 'toon' || value === 'text') {
        outputFormat = value;
        break;
      }
    }

    if (arg?.startsWith('--output=')) {
      const value = arg.slice('--output='.length);

      if (value === 'json' || value === 'toon' || value === 'text') {
        outputFormat = value;
        break;
      }
    }
  }

  return {
    colors: false,
    config: '',
    progress: false,
    verbose: false,
    output: outputFormat,
  };
}
