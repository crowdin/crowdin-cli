#!/usr/bin/env bun

import { Command } from 'commander';
import { buildCommand, buildOption, getHelpConfig } from './cli/builder.ts';
import { commands } from './cli/commands.ts';
import CliError from './cli/errors/CliError.ts';
import colorHook from './cli/hooks/color.ts';
import configHook from './cli/hooks/config.ts';
import formatHook from './cli/hooks/format.ts';
import getGlobalOptions from './cli/options.ts';
import { enableColors } from './cli/utils/colors.ts';
import { createOutput } from './cli/utils/output.ts';

enableColors(!process.argv.includes('--no-colors'));

const name = 'crowdin';
const version = '0.0.1';
const description = `Crowdin CLI is a command-line tool that allows you to manage and synchronize 
localization resources with your Crowdin project.
Visit the official documentation for more details: https://crowdin.github.io/crowdin-cli`;

function createProgram(): Command {
  const program = new Command();

  program
    .name(name)
    .version(version)
    .description(description)
    .configureHelp(getHelpConfig())
    .action(() => {
      program.help();
    });

  for (const opt of getGlobalOptions()) {
    program.addOption(buildOption(opt));
  }

  program.hook('preAction', async (_thisCommand, actionCommand) => {
    formatHook(actionCommand);
    colorHook(actionCommand);
    await configHook(actionCommand);
  });

  return program;
}

async function main() {
  const program = createProgram();

  for (const def of commands) {
    program.addCommand(buildCommand(def));
  }

  // const completion = tab(program);

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

function getOutputFormat(argv: string[]): 'json' | 'toon' | 'text' {
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];

    if (arg === '--format' || arg === '-f') {
      const value = argv[index + 1];

      if (value === 'json' || value === 'toon' || value === 'text') {
        return value;
      }
    }

    if (arg?.startsWith('--format=')) {
      const value = arg.slice('--format='.length);

      if (value === 'json' || value === 'toon' || value === 'text') {
        return value;
      }
    }
  }

  return 'text';
}
