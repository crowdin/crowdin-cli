import type { LabelsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import CliError from '@/cli/errors/CliError.ts';
import type { GetLabelService, GetOutput } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';

export default class LabelCommand {
  constructor(
    private getOutput: GetOutput,
    private getLabelService: GetLabelService,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'label',
      description: 'Manage labels',
      subcommands: [
        {
          name: 'list',
          description: 'List labels',
          action: this.listAction,
        },
        {
          name: 'add',
          description: 'Add a new label',
          arguments: [
            {
              name: 'title',
              description: 'Label title',
            },
          ],
          action: this.addAction,
        },
        {
          name: 'delete',
          description: 'Delete label',
          arguments: [
            {
              name: 'title',
              description: 'Label title',
            },
          ],
          action: this.deleteAction,
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
    const labelService = await this.getLabelService(command);
    const labels = await labelService.list();

    if (labels.length === 0) {
      output.success('No labels found');
      return;
    }

    output.table(labels.map(this.toRow));
  };

  addAction = async (command: Command) => {
    const [title] = command.args;

    if (!title) {
      throw new CliError('Label title is required');
    }

    const output = this.getOutput(command);
    const labelService = await this.getLabelService(command);
    const labels = await labelService.list();
    const existing = labels.find((label) => label.title === title);

    if (existing) {
      output.warning(`Label '${title}' already exists in the project`);
      return;
    }

    const label = await labelService.add(title);

    output.table([this.toRow(label)]);
  };

  deleteAction = async (command: Command) => {
    const [title] = command.args;

    if (!title) {
      throw new CliError('Label title is required');
    }

    const output = this.getOutput(command);
    const labelService = await this.getLabelService(command);
    const labels = await labelService.list();
    const label = labels.find((entry) => entry.title === title);

    if (!label) {
      throw new CliError("Couldn't find label by the specified title");
    }

    await labelService.delete(label.id);

    output.success(`Label '${title}' deleted successfully`);
  };

  private toRow(label: LabelsModel.Label): Record<string, unknown> {
    return {
      id: label.id,
      title: label.title,
    };
  }
}
