import type { LabelsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { projectConfigGroup } from '@/cli/commands/common/options.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { GetLabelService, GetOutput } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { colors } from '@/cli/utils/colors.ts';
import type { View } from '@/cli/utils/output.ts';

// Java message.label.list, shared by list and the add echo (LabelAddAction).
const labelView: View<LabelsModel.Label> = {
  text: (label) => `${colors.yellow(`#${label.id}`)} ${colors.green(label.title)}`,
  plain: (label) => label.title,
  keys: ['id', 'title'],
};

// Java LabelListAction prints the decorated line when `!plainView || isVerbose`, so a verbose
// plain listing carries the ids too.
const labelVerboseView: View<LabelsModel.Label> = {
  text: labelView.text,
  plain: labelView.text,
  keys: labelView.keys,
};

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
          options: [projectConfigGroup],
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
          options: [projectConfigGroup],
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
          options: [projectConfigGroup],
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
    const options = command.optsWithGlobals() as GlobalOptions;
    const output = this.getOutput(command);
    const labelService = await this.getLabelService(command);
    const labels = await labelService.list();

    output.list(labels, options.verbose ? labelVerboseView : labelView, { empty: 'No labels found' });
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

    output.item(label, labelView);
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
}
