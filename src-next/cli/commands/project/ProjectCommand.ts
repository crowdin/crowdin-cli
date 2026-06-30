import { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { projectConfigGroup } from '@/cli/commands/common/options.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { GetOutput, GetProjectService } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { openUrl } from '@/cli/utils/open.ts';
import { language, languageAccessPolicy, sourceLanguage, stringBased } from './options.ts';

interface ProjectCommandOptions extends GlobalOptions {
  sourceLanguage?: string;
  language?: string[];
  public?: boolean;
  stringBased?: boolean;
}

export default class ProjectCommand {
  constructor(
    private getOutput: GetOutput,
    private getProjectService: GetProjectService,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'project',
      description: 'Manage projects',
      subcommands: [
        {
          name: 'browse',
          description: 'Open the current project in the web browser',
          options: [projectConfigGroup],
          action: this.browseAction,
        },
        {
          name: 'list',
          description: 'List projects with manager access',
          options: [projectConfigGroup],
          action: this.listAction,
        },
        {
          name: 'add',
          description: 'Add a new project',
          arguments: [
            {
              name: 'name',
              description: 'Project name',
            },
          ],
          options: [language, sourceLanguage, languageAccessPolicy, stringBased, projectConfigGroup],
          action: this.addAction,
        },
      ],
      action: this.defaultAction,
    };
  }

  defaultAction = async (command: Command) => {
    command.help();
  };

  browseAction = async (command: Command) => {
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const project = await projectService.loadProject();

    openUrl(project.data.webUrl);

    output.success(`Opened ${project.data.webUrl} in browser`);
  };

  listAction = async (command: Command) => {
    const options = command.optsWithGlobals() as ProjectCommandOptions;
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const projects = await projectService.loadProjects(true);

    if (!options.verbose) {
      output.table(
        projects.data.map((project) => ({
          id: project.data.id,
          name: project.data.name,
        })),
      );

      return;
    }

    output.table(
      projects.data.map((project) => ({
        id: project.data.id,
        name: project.data.name,
        type: project.data.type === ProjectsGroupsModel.Type.STRINGS_BASED ? 'string-based' : 'file-based',
        visibility: (project.data.visibility ?? 'private').toString().toLowerCase(),
        lastActivity: this.formatLastActivity(project.data.lastActivity),
      })),
    );
  };

  addAction = async (command: Command) => {
    const options = command.optsWithGlobals() as ProjectCommandOptions;
    const [name] = command.args;
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);

    if (!name) {
      throw new CliError('Project name is required');
    }

    const sourceLanguageId = options.sourceLanguage || 'en';
    const targetLanguageIds = options.language ?? [];
    const data: ProjectsGroupsModel.CreateProjectEnterpriseRequest | ProjectsGroupsModel.CreateProjectRequest =
      projectService.isEnterprise()
        ? {
            name,
            sourceLanguageId,
            targetLanguageIds,
            ...(options.stringBased ? { type: 1 as const } : {}),
          }
        : {
            name,
            identifier: name,
            sourceLanguageId,
            targetLanguageIds,
            visibility: options.public ? 'open' : 'private',
            ...(options.stringBased ? { type: 1 as const } : {}),
          };

    const project = await projectService.addProject(data);

    output.log(`${project.data.id} ${project.data.name}`.trim());
  };

  private formatLastActivity(lastActivity: unknown): string {
    if (!lastActivity) {
      return '';
    }

    if (lastActivity instanceof Date) {
      return lastActivity.toISOString();
    }

    const parsedDate = new Date(String(lastActivity));

    if (Number.isNaN(parsedDate.getTime())) {
      return String(lastActivity);
    }

    return parsedDate.toISOString();
  }
}
