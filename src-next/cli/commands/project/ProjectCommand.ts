import type { Command } from 'commander';
import { projectConfigGroup } from '@/cli/commands/common/options.ts';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { CreateProjectPayload } from '@/cli/services/ProjectService.ts';
import type { GetOutput, GetProjectService } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { openUrl } from '@/cli/utils/open.ts';
import { language, languageAccessPolicy, sourceLanguage, stringBased } from './options.ts';
import { projectAddView, projectVerboseView, projectView } from './views.ts';

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

    output.list(
      projects.data.map((project) => project.data),
      options.verbose ? projectVerboseView : projectView,
      { empty: 'No projects found' },
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
    // No `identifier`: the API generates one from the name, and a name with a space or any other
    // character the identifier rules reject ('CLI 27') made the request fail outright. Java never
    // sends one either.
    const data: CreateProjectPayload = projectService.isEnterprise()
      ? {
          name,
          sourceLanguageId,
          targetLanguageIds,
          ...(options.stringBased ? { type: 1 as const } : {}),
        }
      : {
          name,
          sourceLanguageId,
          targetLanguageIds,
          visibility: options.public ? 'open' : 'private',
          ...(options.stringBased ? { type: 1 as const } : {}),
        };

    const project = await projectService.addProject(data);

    output.item(project.data, projectAddView);
  };
}
