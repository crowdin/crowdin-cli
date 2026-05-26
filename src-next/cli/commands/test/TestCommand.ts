import type { Command } from 'commander';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { GetApiClient, GetOutput } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';

export default class TestCommand {
  constructor(
    private getOutput: GetOutput,
    private getApiClient: GetApiClient,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'test',
      description: 'Command for testing',
      action: this.defaultAction,
    };
  }

  defaultAction = async (command: Command) => {
    const options = command.optsWithGlobals() as GlobalOptions;
    const output = this.getOutput(command);
    const apiClient = await this.getApiClient(command);

    output.info('Testing API connection...');

    try {
      const user = await apiClient.usersApi.getAuthenticatedUser();
      output.success(`Connected as: ${user.data.username}`);
    } catch (error) {
      if (error instanceof Error) {
        throw new CliError(`Failed to connect to Crowdin API. ${error.message}`);
      }

      throw new CliError('Failed to connect to Crowdin API');
    }
  };
}
