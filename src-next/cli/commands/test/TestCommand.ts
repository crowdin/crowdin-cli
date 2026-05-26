import type { Command } from 'commander';
import CliError from '../../errors/CliError.ts';
import type { GlobalOptions } from '../../options.ts';
import type { GetApiClient } from '../../services.ts';
import type { Output } from '../../utils/output.ts';
import type { CommandDef } from '../../types.ts';

type GetOutput = (command: Command) => Output;

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
