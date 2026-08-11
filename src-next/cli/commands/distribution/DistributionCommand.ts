import type { DistributionsModel, PatchRequest } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { projectConfigGroup } from '@/cli/commands/common/options.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { GetDistributionService, GetOutput } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import type { View } from '@/cli/utils/output.ts';
import { toNumberArray } from '@/cli/utils/parsing.ts';
import { bundleId, name } from './options.ts';

interface DistributionOptions extends GlobalOptions {
  name?: string;
  bundleId?: number | string | Array<number | string>;
}

// Java message.distribution.list: hash, name, export mode. Java's add/edit echoes drop to the name
// alone in plain view; we keep the listing's shape so the hash — what `release`/`edit` take — stays.
const distributionView: View<DistributionsModel.Distribution> = {
  text: (distribution) => `${distribution.hash} ${distribution.name ?? ''} ${distribution.exportMode ?? ''}`,
  plain: (distribution) => `${distribution.hash} ${distribution.name ?? ''}`,
};

export default class DistributionCommand {
  constructor(
    private getOutput: GetOutput,
    private getDistributionService: GetDistributionService,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'distribution',
      description: 'Manage distributions',
      subcommands: [
        {
          name: 'list',
          description: 'List distributions',
          options: [projectConfigGroup],
          action: this.listAction,
        },
        {
          name: 'add',
          description: 'Add a new distribution',
          arguments: [
            {
              name: 'name',
              description: 'Distribution name',
            },
          ],
          options: [bundleId, projectConfigGroup],
          action: this.addAction,
        },
        {
          name: 'edit',
          description: 'Edit existing distribution',
          arguments: [
            {
              name: 'hash',
              description: 'Distribution hash',
            },
          ],
          options: [name, bundleId, projectConfigGroup],
          action: this.editAction,
        },
        {
          name: 'release',
          description: 'Release a distribution',
          arguments: [
            {
              name: 'hash',
              description: 'Distribution hash',
            },
          ],
          options: [projectConfigGroup],
          action: this.releaseAction,
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
    const distributionService = await this.getDistributionService(command);
    const distributions = await distributionService.list();

    output.list(distributions, distributionView, { empty: 'No distributions found' });
  };

  addAction = async (command: Command) => {
    const [distributionName] = command.args;
    const options = command.optsWithGlobals() as DistributionOptions;
    const bundleIds = toNumberArray(options.bundleId, 'Invalid bundle id');

    if (!distributionName) {
      throw new CliError('Distribution name is required');
    }

    if (bundleIds.length === 0) {
      throw new CliError('Bundle IDs are required. Use --bundle-id <id> (can be specified multiple times)');
    }

    const output = this.getOutput(command);
    const distributionService = await this.getDistributionService(command);
    const distribution = await distributionService.add(distributionName, bundleIds);

    output.item(distribution, distributionView);
  };

  editAction = async (command: Command) => {
    const [hash] = command.args;
    const options = command.optsWithGlobals() as DistributionOptions;
    const bundleIds = toNumberArray(options.bundleId, 'Invalid bundle id');
    const patch: PatchRequest[] = [];

    if (!hash) {
      throw new CliError('Distribution hash is required');
    }

    if (options.name !== undefined) {
      patch.push({ op: 'replace', path: '/name', value: options.name });
    }

    if (options.bundleId !== undefined) {
      patch.push({ op: 'replace', path: '/bundleIds', value: bundleIds });
    }

    if (patch.length === 0) {
      throw new CliError('Specify the parameters to edit the distribution');
    }

    const output = this.getOutput(command);
    const distributionService = await this.getDistributionService(command);

    await distributionService.getByHash(hash);
    const updated = await distributionService.edit(hash, patch);

    output.item(updated, distributionView);
  };

  releaseAction = async (command: Command) => {
    const [hash] = command.args;

    if (!hash) {
      throw new CliError('Distribution hash is required');
    }

    const output = this.getOutput(command);
    const distributionService = await this.getDistributionService(command);

    await distributionService.getByHash(hash);

    output.spinner('distributionRelease', 'start', `Releasing distribution ${hash}`);

    try {
      await distributionService.releaseDistribution(hash, (progress) =>
        output.spinner('distributionRelease', 'message', `Releasing distribution ${hash}: ${progress}%`),
      );

      output.spinner('distributionRelease', 'stop', `Distribution '${hash}' has been successfully released`);
    } catch (error) {
      output.spinner('distributionRelease', 'error', 'Distribution release failed');
      throw error;
    }
  };
}
