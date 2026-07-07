import type { Command } from 'commander';
import { projectConfigGroup } from '@/cli/commands/common/options.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { GetAppService, GetOutput } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { force } from './options.ts';

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
          options: [projectConfigGroup],
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
          options: [projectConfigGroup],
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
          options: [force, projectConfigGroup],
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

    output.table(
      apps.map((app) => ({ identifier: app.identifier, name: app.name })),
      ['identifier', 'name'],
    );
  };

  installAction = async (command: Command) => {
    const [identifier] = command.args;

    if (!identifier) {
      throw new CliError('Application identifier can not be empty');
    }

    const output = this.getOutput(command);
    const appService = await this.getAppService(command);
    const manifestUrl = await appService.findManifestUrl(identifier);

    if (!manifestUrl) {
      throw new CliError(`Application with identifier '${identifier}' doesn't exist in Crowdin Store`);
    }

    await appService.installByManifestUrl(manifestUrl);
    output.success('Application has been installed');
  };

  uninstallAction = async (command: Command) => {
    const [identifier] = command.args;

    if (!identifier) {
      throw new CliError('Application identifier can not be empty');
    }

    const options = command.optsWithGlobals() as UninstallOptions;
    const output = this.getOutput(command);
    const appService = await this.getAppService(command);

    await appService.uninstall(identifier, options.force ?? false);
    output.success('Application has been uninstalled');
  };
}
