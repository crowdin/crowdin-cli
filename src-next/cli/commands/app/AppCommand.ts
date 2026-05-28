import type { ApplicationsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { GetAppService, GetOutput } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';

interface UninstallOptions extends GlobalOptions {
  force?: boolean;
}

export default class AppCommand {
  constructor(
    private getOutput: GetOutput,
    private getAppService: GetAppService,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'app',
      description: 'Manage apps',
      subcommands: [
        {
          name: 'list',
          description: 'List installed apps',
          action: this.listAction,
        },
        {
          name: 'install',
          description: 'Install the application',
          arguments: [
            {
              name: 'identifier',
              description: 'Application identifier. You can find it on Crowdin Store',
            },
          ],
          action: this.installAction,
        },
        {
          name: 'uninstall',
          description: 'Uninstall the application',
          arguments: [
            {
              name: 'identifier',
              description: 'Application identifier',
            },
          ],
          options: [
            {
              name: 'force',
              type: 'boolean',
              description: 'Force to uninstall application',
            },
          ],
          action: this.uninstallAction,
        },
      ],
      action: this.defaultAction,
    };
  }

  defaultAction = async (command: Command) => {
    command.help();
  };

  listAction = async (command: Command) => {
    const output = this.getOutput(command);
    const appService = await this.getAppService(command);
    const apps = await appService.list();

    if (apps.length === 0) {
      output.success('No applications found');
      return;
    }

    output.table(this.toRows(apps), ['identifier', 'name']);
  };

  installAction = async (command: Command) => {
    const [identifier] = command.args;
    const output = this.getOutput(command);
    const appService = await this.getAppService(command);

    if (!identifier) {
      throw new CliError('Application identifier can not be empty');
    }

    const manifestUrl = await appService.findManifestUrl(identifier);

    if (!manifestUrl) {
      throw new CliError(`Application with identifier '${identifier}' doesn't exist in Crowdin Store`);
    }

    await appService.installByManifestUrl(manifestUrl);
    output.success(`Application ${identifier} has been installed`);
  };

  uninstallAction = async (command: Command) => {
    const options = command.optsWithGlobals() as UninstallOptions;
    const [identifier] = command.args;
    const output = this.getOutput(command);
    const appService = await this.getAppService(command);

    if (!identifier) {
      throw new CliError('Application identifier can not be empty');
    }

    await appService.uninstall(identifier, options.force ?? false);
    output.success(`Application ${identifier} has been uninstalled`);
  };

  private toRows(apps: ApplicationsModel.Application[]): Record<string, string>[] {
    return apps.map((app) => ({
      identifier: app.identifier,
      name: app.name,
    }));
  }
}
