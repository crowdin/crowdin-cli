import { type PatchRequest, ProjectsGroupsModel, type SourceFilesModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { projectConfigGroup } from '@/cli/commands/common/options.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { BranchService } from '@/cli/services/BranchService.ts';
import type { GetBranchService, GetOutput, GetProjectService } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { normalizeBranchName } from '@/cli/utils/parsing.ts';
import { stripLeadingSlashes } from '@/lib/utils/path.ts';
import { add, edit, merge } from './options.ts';

interface AddOptions extends GlobalOptions {
  title?: string;
  exportPattern?: string;
  priority?: SourceFilesModel.Priority;
}

interface EditOptions extends GlobalOptions {
  name?: string;
  title?: string;
  priority?: SourceFilesModel.Priority;
}

interface MergeOptions extends GlobalOptions {
  dryrun?: boolean;
  deleteAfterMerge?: boolean;
}

export default class BranchCommand {
  constructor(
    private getOutput: GetOutput,
    private getProjectService: GetProjectService,
    private getBranchService: GetBranchService,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'branch',
      description: 'Manage branches in a Crowdin project',
      subcommands: [
        {
          name: 'list',
          description: 'List branches in the current project',
          options: [projectConfigGroup],
          action: this.listAction,
        },
        {
          name: 'add',
          description: 'Create a new branch',
          arguments: [
            {
              name: 'name',
              description: 'Branch name',
            },
          ],
          options: [add.title, add.exportPattern, add.priority, projectConfigGroup],
          action: this.addAction,
        },
        {
          name: 'delete',
          description: 'Delete a branch',
          arguments: [
            {
              name: 'name',
              description: 'Branch name',
            },
          ],
          options: [projectConfigGroup],
          action: this.deleteAction,
        },
        {
          name: 'edit',
          description: 'Edit existing branch',
          arguments: [
            {
              name: 'name',
              description: 'Branch name',
            },
          ],
          options: [edit.name, edit.title, edit.priority, projectConfigGroup],
          action: this.editAction,
        },
        {
          name: 'clone',
          description: 'Clone branch',
          arguments: [
            {
              name: 'source',
              description: 'Source branch name',
            },
            {
              name: 'target',
              description: 'Target branch name',
            },
          ],
          options: [projectConfigGroup],
          action: this.cloneAction,
        },
        {
          name: 'merge',
          description: 'Merge branches',
          arguments: [
            {
              name: 'source',
              description: 'Source branch name',
            },
            {
              name: 'target',
              description: 'Target branch name',
            },
          ],
          options: [merge.dryrun, merge.deleteAfterMerge, projectConfigGroup],
          action: this.mergeAction,
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
    const branchService = await this.getBranchService(command);
    const branches = await branchService.list();

    output.list(branches.map(this.toRow), { empty: 'No branches found' });
  };

  addAction = async (command: Command) => {
    const [name] = command.args;

    if (!name) {
      throw new CliError('Branch name is required');
    }

    const options = command.optsWithGlobals() as AddOptions;
    const output = this.getOutput(command);
    const branchService = await this.getBranchService(command);
    const branches = await branchService.list();

    if (branches.some((branch) => branch.name === name)) {
      output.warning(`Branch '${name}' already exists in the project`);
      return;
    }

    const branchName = normalizeBranchName(name);
    const branchTitle = options.title === undefined && name !== branchName ? name : options.title;
    const branch = await branchService.add({
      name: branchName,
      ...(branchTitle !== undefined ? { title: branchTitle } : {}),
      ...(options.exportPattern !== undefined ? { exportPattern: options.exportPattern } : {}),
      ...(options.priority !== undefined ? { priority: options.priority } : {}),
    });

    output.table([this.toRow(branch)]);
  };

  deleteAction = async (command: Command) => {
    const [name] = command.args;

    if (!name) {
      throw new CliError('Branch name is required');
    }

    const output = this.getOutput(command);
    const branchService = await this.getBranchService(command);
    const branchName = normalizeBranchName(name);
    const branch = (await branchService.list()).find((entry) => entry.name === branchName);

    if (!branch) {
      output.warning(`Branch '${name}' doesn't exist in the project`);
      return;
    }

    await branchService.delete(branch.id);

    output.success(`Branch '${name}' deleted`);
  };

  editAction = async (command: Command) => {
    const [name] = command.args;

    if (!name) {
      throw new CliError('Branch name is required');
    }

    const options = command.optsWithGlobals() as EditOptions;

    if (options.name === undefined && options.title === undefined && options.priority === undefined) {
      throw new CliError('Specify some parameters to edit the branch');
    }

    const output = this.getOutput(command);
    const branchService = await this.getBranchService(command);
    const branch = await this.findBranch(branchService, name);
    const patches: PatchRequest[] = [];

    if (options.name !== undefined) {
      patches.push({ op: 'replace', path: '/name', value: normalizeBranchName(options.name) });
    }

    if (options.title !== undefined) {
      patches.push({ op: 'replace', path: '/title', value: options.title });
    }

    if (options.priority !== undefined) {
      patches.push({ op: 'replace', path: '/priority', value: options.priority });
    }

    const updatedBranch = await branchService.edit(branch.id, patches);

    output.table([this.toRow(updatedBranch)]);
  };

  cloneAction = async (command: Command) => {
    const [source, target] = command.args;

    if (!source || !target) {
      throw new CliError('Source and target branch names are required');
    }

    const output = this.getOutput(command);
    const branchService = await this.getBranchService(command);

    await this.ensureStringsBasedProject(command);

    const sourceBranch = await this.findBranch(branchService, source);
    const targetName = normalizeBranchName(target);
    const request: SourceFilesModel.CloneBranchRequest = {
      name: targetName,
      ...(target !== targetName ? { title: target } : {}),
    };

    output.spinner('branch-clone', 'start', 'Cloning branch');

    let cloneId: string;

    try {
      let status = await branchService.startClone(sourceBranch.id, request);

      while (status.status !== 'finished') {
        if (status.status === 'failed') {
          throw new CliError('Failed to clone the branch');
        }

        output.spinner('branch-clone', 'message', `Cloning branch (${status.progress}%)`);
        await Bun.sleep(1000);

        status = await branchService.checkCloneStatus(sourceBranch.id, status.identifier);
      }

      output.spinner('branch-clone', 'stop', 'Cloning branch (100%)');
      cloneId = status.identifier;
    } catch (error) {
      output.spinner('branch-clone', 'error', 'Failed to clone the branch');
      throw error;
    }

    const clonedBranch = await branchService.getClonedBranch(sourceBranch.id, cloneId);

    output.table([this.toRow(clonedBranch)]);
  };

  mergeAction = async (command: Command) => {
    const [source, target] = command.args;

    if (!source || !target) {
      throw new CliError('Source and target branch names are required');
    }

    const options = command.optsWithGlobals() as MergeOptions;
    const output = this.getOutput(command);
    const branchService = await this.getBranchService(command);

    await this.ensureStringsBasedProject(command);

    const sourceBranch = await this.findBranch(branchService, source);
    const targetBranch = await this.findBranch(branchService, target);

    const request: SourceFilesModel.MergeBranchRequest = {
      sourceBranchId: sourceBranch.id,
      deleteAfterMerge: Boolean(options.deleteAfterMerge),
      dryRun: Boolean(options.dryrun),
    };

    output.spinner('branch-merge', 'start', 'Merging branch');

    let mergeId: string;

    try {
      let status = await branchService.startMerge(targetBranch.id, request);

      while (status.status !== 'finished') {
        if (status.status === 'failed') {
          throw new CliError('Failed to merge the branch');
        }

        output.spinner('branch-merge', 'message', `Merging branch (${status.progress}%)`);
        await Bun.sleep(1000);

        status = await branchService.checkMergeStatus(targetBranch.id, status.identifier);
      }

      output.spinner('branch-merge', 'stop', 'Merging branch (100%)');
      mergeId = status.identifier;
    } catch (error) {
      output.spinner('branch-merge', 'error', 'Failed to merge the branch');
      throw error;
    }

    const summary = await branchService.getMergeSummary(targetBranch.id, mergeId);

    if (options.output !== undefined && options.output !== 'text') {
      output.table([{ targetBranchId: summary.targetBranchId, ...summary.details }]);
      return;
    }

    const summaryStr = Object.entries(summary.details)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    output.success(`Merged branch '${source}' into '${target}'`);
    output.log(`\tMerge summary: ${summaryStr}`);
  };

  private async ensureStringsBasedProject(command: Command): Promise<void> {
    const projectService = await this.getProjectService(command);
    const project = await projectService.loadProject();

    if (project.data.type !== ProjectsGroupsModel.Type.STRINGS_BASED) {
      throw new CliError('This command is only available for string-based projects');
    }
  }

  private async findBranch(branchService: BranchService, name: string): Promise<SourceFilesModel.Branch> {
    const normalizedName = normalizeBranchName(name);
    const branch = (await branchService.list()).find((entry) => entry.name === normalizedName);

    if (!branch) {
      throw new CliError(`Project doesn't contain the '${name}' branch`);
    }

    return branch;
  }

  private toRow(branch: SourceFilesModel.Branch): Record<string, unknown> {
    return {
      name: stripLeadingSlashes(branch.name),
      id: branch.id,
    };
  }
}
