import type { Command } from 'commander';
import CliError from '../../errors/CliError.ts';
import type { GlobalOptions } from '../../options.ts';
import type { ProjectService } from '../../services/ProjectService.ts';
import type { CommandDef } from '../../types.ts';
import type { Output } from '../../utils/output.ts';
import language from './options/language.ts';

interface StatusCommandOptions extends GlobalOptions {
  language?: string;
}

type ProgressView = 'all' | 'translated' | 'proofread';
type GetOutput = (command: Command) => Output;
type GetProjectService = (command: Command) => Promise<ProjectService>;

export default class StatusCommand {
  constructor(
    private getOutput: GetOutput,
    private getProjectService: GetProjectService,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'status',
      description: 'Show translation and proofreading progress',
      action: this.defaultAction,
      options: [language],
      subcommands: [
        {
          name: 'translation',
          description: 'Show translation progress',
          options: [language],
          action: this.translationStatusAction,
        },
        {
          name: 'proofreading',
          description: 'Show proofreading progress',
          options: [language],
          action: this.proofreadingStatusAction,
        },
      ],
    };
  }

  defaultAction = async (command: Command) => {
    await this.showProgress('all', command);
  };

  translationStatusAction = async (command: Command) => {
    await this.showProgress('translated', command);
  };

  proofreadingStatusAction = async (command: Command) => {
    await this.showProgress('proofread', command);
  };

  private async showProgress(show: ProgressView, command: Command) {
    const options = command.optsWithGlobals() as StatusCommandOptions;
    const output = this.getOutput(command);
    const projectService = await this.getProjectService(command);
    const project = await projectService.loadProject();
    const languageId = options.language || null;
    const targetLanguageIds = project.data.targetLanguages.map((language) => language.id);

    if (languageId && languageId !== 'all' && !targetLanguageIds.includes(languageId)) {
      throw new CliError(`Language ${languageId} does not exist in project. Try specifying another language code`);
    }

    const projectProgress = await projectService.progress.loadProjectProgress();
    const progress: Record<string, Record<string, string>> = {};

    for (const languageProgress of projectProgress.data) {
      if (languageId && languageProgress.data.languageId !== languageId && languageId !== 'all') {
        continue;
      }

      if (show === 'all' || show === 'translated') {
        if (!progress.Translation) {
          progress.Translation = {};
        }

        progress.Translation[languageProgress.data.languageId] = `${languageProgress.data.translationProgress}%`;
      }

      if (show === 'all' || show === 'proofread') {
        if (!progress.Proofread) {
          progress.Proofread = {};
        }

        progress.Proofread[languageProgress.data.languageId] = `${languageProgress.data.approvalProgress}%`;
      }
    }

    output.log(progress, { showAsTable: true });
  }
}
