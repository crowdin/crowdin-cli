import type { PatchRequest } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { projectConfigGroup } from '@/cli/commands/common/options.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { DistributionView } from '@/cli/services/DistributionService.ts';
import type { GetDistributionService, GetOutput } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { toNumberArray } from '@/cli/utils/parsing.ts';
import { bundleId, name } from './options.ts';

interface DistributionOptions extends GlobalOptions {
  name?: string;
  bundleId?: number | string | Array<number | string>;
}

const RELEASE_PENDING_STATUSES = new Set(['success', 'finished', 'failed']);

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

    if (distributions.length === 0) {
      output.success('No distributions found');
      return;
    }

    output.table(distributions.map(this.toRow));
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

    output.table([this.toRow(distribution)]);
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
      throw new CliError('Nothing to edit. Specify at least one option: --name, --bundle-id');
    }

    const output = this.getOutput(command);
    const distributionService = await this.getDistributionService(command);

    await distributionService.getByHash(hash);
    const updated = await distributionService.edit(hash, patch);

    output.table([this.toRow(updated)]);
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
      let release = await distributionService.startRelease(hash);

      while (!RELEASE_PENDING_STATUSES.has(release.status?.toLowerCase() ?? '')) {
        if (release.progress !== undefined) {
          output.spinner('distributionRelease', 'message', `Releasing distribution ${hash}: ${release.progress}%`);
        }

        await Bun.sleep(1000);
        release = await distributionService.getReleaseStatus(hash);
      }

      if (release.status?.toLowerCase() === 'failed') {
        throw new CliError(`Distribution ${hash} release failed`);
      }

      output.spinner('distributionRelease', 'stop', `Distribution ${hash} released`);
    } catch (error) {
      output.spinner('distributionRelease', 'error', `Distribution ${hash} release failed`);
      throw error;
    }
  };

  private toRow(distribution: DistributionView): Record<string, unknown> {
    return {
      hash: distribution.hash,
      name: distribution.name ?? '',
    };
  }
}
