import type { AiModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { assigned as assignedOption, baseConfigGroup } from '@/cli/commands/common/options.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { GetAiService, GetConfig, GetOutput } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { assertProjectConfigured } from '@/lib/config.ts';
import { action as actionOption } from './options.ts';
import { createAiPromptView } from './views.ts';

interface ListOptions extends GlobalOptions {
  action?: AiModel.Action;
  assigned?: boolean;
}

export default class AiPromptCommand {
  constructor(
    private getOutput: GetOutput,
    private getAiService: GetAiService,
    private getConfig: GetConfig,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'ai-prompt',
      description: 'Manage AI prompts',
      subcommands: [
        {
          name: 'list',
          description: 'Show a list of AI prompts',
          options: [actionOption, assignedOption, baseConfigGroup],
          action: this.listAction,
        },
      ],
      action: this.defaultAction,
    };
  }

  defaultAction = async (command: Command) => {
    command.help();
  };

  listAction = async (command: Command) => {
    const options = command.optsWithGlobals() as ListOptions;
    const output = this.getOutput(command);
    const aiService = await this.getAiService(command);
    const projectId = await this.assignedProjectId(command, options);
    const prompts = await aiService.listPrompts({
      ...(options.action !== undefined ? { action: options.action } : {}),
      ...(projectId !== undefined ? { projectId } : {}),
    });

    output.list(prompts, createAiPromptView({ verbose: options.verbose }), {
      empty: options.assigned ? 'No AI prompts available for the project' : 'No AI prompts found',
    });
  };

  private async assignedProjectId(command: Command, options: ListOptions): Promise<number | undefined> {
    if (!options.assigned) {
      return undefined;
    }

    const config = await this.getConfig(command);

    assertProjectConfigured(config);

    return config.projectId;
  }
}
