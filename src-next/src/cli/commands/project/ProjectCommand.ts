import type { Command } from 'commander';
import CliError, { toCliError } from '../../errors/CliError.ts';
import type { Client } from '../../../lib/api/client.ts';
import type { Output } from '../../utils/output.ts';
import type { ProjectService } from '../../services/ProjectService.ts';
import type { GlobalOptions } from '../../options.ts';
import type { CommandDef } from '../../types.ts';
import language from './options/language.ts';
import languageAccessPolicy from './options/languageAccessPolicy.ts';
import sourceLanguage from './options/sourceLanguage.ts';
import stringBased from './options/stringBased.ts';

interface ProjectCommandOptions extends GlobalOptions {
  sourceLanguage?: string;
  language?: string[];
  public?: boolean;
  stringBased?: boolean;
}

type GetOutput = (command: Command) => Output;
type GetProjectService = (command: Command) => Promise<ProjectService>;
type GetApiClient = (command: Command) => Promise<Client>;

export default class ProjectCommand {
  constructor(
    private getOutput: GetOutput,
    private getProjectService: GetProjectService,
    private getApiClient: GetApiClient,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'project',
      description: 'Manage projects',
      subcommands: [
        {
          name: 'browse',
          description: 'Open the current project in the web browser',
          action: this.browseAction,
        },
        {
          name: 'list',
          description: 'List projects with manager access',
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
          options: [language, sourceLanguage, languageAccessPolicy, stringBased],
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

    Bun.spawn(['open', project.data.webUrl]);

    output.success(`Opened ${project.data.webUrl} in browser`);
  };

  listAction = async (command: Command) => {
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const projects = await projectService.loadProjects(true);

    output.log(
      projects.data.map((project) => ({
        Id: project.data.id,
        Name: project.data.name,
      })),
      { showAsTable: true },
    );
  };

  addAction = async (command: Command) => {
    const options = command.optsWithGlobals() as ProjectCommandOptions;
    const [name] = command.args;
    const output = this.getOutput(command);
    const apiClient = await this.getApiClient(command);

    if (!name) {
      throw new CliError('Project name is required');
    }

    const languageAccessPolicy: 'open' | 'moderate' = options.public ? 'open' : 'moderate';

    const data = {
      name,
      sourceLanguageId: options.sourceLanguage || 'en',
      targetLanguageIds: options.language ?? [],
      languageAccessPolicy,
      stringBased: options.stringBased || false,
    };

    try {
      const project = await apiClient.addProject(
        data.name,
        data.sourceLanguageId,
        data.targetLanguageIds,
        data.languageAccessPolicy,
        data.stringBased,
      );

      output.log([{ Id: project.data.id, Name: project.data.name }], {
        showAsTable: true,
      });
    } catch (error) {
      throw toCliError(error, `Failed to add project`);
    }
  };
}
