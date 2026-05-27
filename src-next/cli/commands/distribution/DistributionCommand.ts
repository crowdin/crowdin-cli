import type { Command } from 'commander';
import CliError, { toCliError } from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { GetApiClient, GetOutput, GetProjectService } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import bundleId from './options/bundleId.ts';
import name from './options/name.ts';

interface DistributionCommandOptions extends GlobalOptions {
  name?: string;
  bundleId?: number | string | Array<number | string>;
}

interface DistributionRecord {
  id?: number;
  hash: string;
  name?: string;
}

interface DistributionRelease {
  status?: string;
  progress?: number;
}

export default class DistributionCommand {
  constructor(
    private getOutput: GetOutput,
    private getProjectService: GetProjectService,
    private getApiClient: GetApiClient,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'distribution',
      description: 'Manage distributions',
      subcommands: [
        {
          name: 'list',
          description: 'List distributions',
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
          options: [bundleId],
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
          options: [name, bundleId],
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
    const apiClient = await this.getApiClient(command);
    const projectService = await this.getProjectService(command);
    const project = await projectService.loadProject();

    try {
      const distributions = await apiClient.distributionsApi.listDistributions(project.data.id);
      const entries = distributions.data.map((distribution) => {
        const value = distribution.data.name ?? '';
        return `${distribution.data.hash} ${value}`.trim();
      });

      if (entries.length > 0) {
        output.log(entries.join('\n'));
      }
    } catch (error) {
      throw toCliError(error, 'Failed to list distributions');
    }
  };

  addAction = async (command: Command) => {
    const options = command.optsWithGlobals() as DistributionCommandOptions;
    const [distributionName] = command.args;
    const apiClient = await this.getApiClient(command);
    const projectService = await this.getProjectService(command);
    const project = await projectService.loadProject();
    const bundleIds = this.parseBundleIds(options.bundleId);

    if (!distributionName) {
      throw new CliError('Distribution name is required');
    }

    if (!bundleIds || bundleIds.length === 0) {
      throw new CliError('Bundle IDs are required. Use --bundle-id <id> (can be specified multiple times)');
    }

    try {
      const distribution = await apiClient.distributionsApi.createDistribution(project.data.id, {
        name: distributionName,
        bundleIds,
      });

      const value = distribution.data.name ?? '';
      console.log(`${distribution.data.hash} ${value}`.trim());
    } catch (error) {
      throw toCliError(error, 'Failed to add distribution');
    }
  };

  editAction = async (command: Command) => {
    const options = command.optsWithGlobals() as DistributionCommandOptions;
    const [hash] = command.args;
    const output = this.getOutput(command);
    const apiClient = await this.getApiClient(command);
    const projectService = await this.getProjectService(command);
    const project = await projectService.loadProject();
    const bundleIds = this.parseBundleIds(options.bundleId);
    const updates: Array<{ op: 'replace'; path: '/name' | '/bundleIds'; value: string | number[] }> = [];

    if (!hash) {
      throw new CliError('Distribution hash is required');
    }

    if (options.name !== undefined) {
      updates.push({
        op: 'replace',
        path: '/name',
        value: options.name,
      });
    }

    if (bundleIds !== undefined) {
      updates.push({
        op: 'replace',
        path: '/bundleIds',
        value: bundleIds,
      });
    }

    if (updates.length === 0) {
      throw new CliError('Nothing to edit. Specify at least one option: --name, --bundle-id');
    }

    try {
      await this.getDistributionByHash(project.data.id, hash, command);
      const distribution = await apiClient.distributionsApi.editDistribution(project.data.id, hash, updates);
      const value = distribution.data.name ?? '';
      output.log(`${distribution.data.hash} ${value}`.trim());
    } catch (error) {
      throw toCliError(error, `Failed to edit distribution ${hash}`);
    }
  };

  releaseAction = async (command: Command) => {
    const [hash] = command.args;
    const output = this.getOutput(command);
    const apiClient = await this.getApiClient(command);
    const projectService = await this.getProjectService(command);
    const project = await projectService.loadProject();

    if (!hash) {
      throw new CliError('Distribution hash is required');
    }

    await this.getDistributionByHash(project.data.id, hash, command);
    output.spinner('distributionRelease', 'start', `Releasing distribution ${hash}`);

    try {
      let release = (await apiClient.distributionsApi.createDistributionRelease(project.data.id, hash))
        .data as DistributionRelease;

      while (this.isReleasePending(release.status)) {
        if (release.progress !== undefined) {
          output.spinner('distributionRelease', 'message', `Releasing distribution ${hash}: ${release.progress}%`);
        }

        await Bun.sleep(1000);
        release = (await apiClient.distributionsApi.getDistributionRelease(project.data.id, hash))
          .data as DistributionRelease;
      }

      if (this.isReleaseFailed(release.status)) {
        throw new CliError(`Distribution ${hash} release failed`);
      }

      output.spinner('distributionRelease', 'stop', `Distribution ${hash} released`);
      output.success(`Distribution ${hash} released`);
    } catch (error) {
      output.spinner('distributionRelease', 'error', `Distribution ${hash} release failed`);
      throw toCliError(error, `Failed to release distribution ${hash}`);
    }
  };

  private async getDistributionByHash(projectId: number, hash: string, command: Command): Promise<DistributionRecord> {
    const apiClient = await this.getApiClient(command);

    try {
      const distributions = await apiClient.distributionsApi.listDistributions(projectId);
      const distribution = distributions.data.find((entry) => entry.data.hash === hash)?.data;

      if (!distribution) {
        throw new CliError(`Distribution ${hash} not found`);
      }

      return distribution as DistributionRecord;
    } catch (error) {
      throw toCliError(error, `Failed to find distribution ${hash}`);
    }
  }

  private parseBundleIds(value?: number | string | Array<number | string>): number[] | undefined {
    if (value === undefined || value === '') {
      return undefined;
    }

    const values = Array.isArray(value) ? value : [value];
    const bundleIds = values.map((bundleId) => {
      const parsed = typeof bundleId === 'number' ? bundleId : parseInt(bundleId, 10);

      if (!Number.isInteger(parsed)) {
        throw new CliError(`Invalid bundle ID: ${bundleId}`);
      }

      return parsed;
    });

    return bundleIds.length > 0 ? bundleIds : undefined;
  }

  private isReleasePending(status?: string): boolean {
    const normalizedStatus = status?.toLowerCase() ?? '';

    return normalizedStatus !== 'success' && normalizedStatus !== 'finished' && normalizedStatus !== 'failed';
  }

  private isReleaseFailed(status?: string): boolean {
    return status?.toLowerCase() === 'failed';
  }
}
