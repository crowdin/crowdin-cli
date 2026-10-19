import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import type { AiModel } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import AiPromptCommand from '@/cli/commands/ai-prompt/AiPromptCommand.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { AiService } from '@/cli/services/AiService.ts';
import { createOutput, type Output } from '@/cli/utils/output.ts';

describe('AiPromptCommand', () => {
  let output: Output;
  let configuredProjectId: number | undefined;
  let aiService: {
    listPrompts: ReturnType<typeof mock<AiService['listPrompts']>>;
  };

  const globalOptions: GlobalOptions = {
    verbose: false,
    config: '',
    colors: false,
    progress: false,
    output: 'json',
  };

  const createCommandContext = (options: Record<string, unknown>) =>
    ({ optsWithGlobals: () => ({ ...globalOptions, ...options }), args: [] }) as unknown as Command;

  const createPrompt = (overrides: Partial<AiModel.AiPromptResponse> = {}): AiModel.AiPromptResponse =>
    ({
      id: 42,
      name: 'Pre-translate',
      action: 'pre_translate',
      isEnabled: true,
      enabledProjectIds: [1],
      aiProviderId: 5,
      aiModelId: 'gpt-4o',
      lastUsedAt: null,
      ...overrides,
    }) as AiModel.AiPromptResponse;

  const createAiPromptCommand = () =>
    new AiPromptCommand(
      () => output,
      async () => aiService as unknown as AiService,
      async () => ({ projectId: configuredProjectId }) as never,
    );

  beforeEach(() => {
    output = createOutput(globalOptions);
    configuredProjectId = 1;
    aiService = {
      listPrompts: mock(async () => [] as AiModel.AiPromptResponse[]),
    };

    spyOn(console, 'log').mockImplementation(() => {});
    spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    mock.restore();
  });

  test('delegates default action to command help', async () => {
    const help = mock(() => {});

    await createAiPromptCommand().defaultAction({ help } as unknown as Command);

    expect(help).toHaveBeenCalledTimes(1);
  });

  describe('list', () => {
    test('serializes the listed keys only', async () => {
      aiService.listPrompts.mockResolvedValue([createPrompt()]);

      await createAiPromptCommand().listAction(createCommandContext({}));

      expect(console.log).toHaveBeenCalledWith(
        JSON.stringify([{ id: 42, name: 'Pre-translate', action: 'pre_translate', isEnabled: true }], null, 2),
      );
    });

    test('passes the action and the configured project id to the service', async () => {
      await createAiPromptCommand().listAction(createCommandContext({ action: 'qa_check', assigned: true }));
      await createAiPromptCommand().listAction(createCommandContext({}));

      expect(aiService.listPrompts.mock.calls).toEqual([[{ action: 'qa_check', projectId: 1 }], [{}]]);
    });

    test('fails when --assigned has no project id to filter by', async () => {
      configuredProjectId = undefined;

      expect(createAiPromptCommand().listAction(createCommandContext({ assigned: true }))).rejects.toThrow(
        "Required option 'project_id' is missing",
      );
    });

    test('reports an empty assigned listing as project-scoped', async () => {
      output = createOutput({ ...globalOptions, output: 'text' });

      await createAiPromptCommand().listAction(createCommandContext({ assigned: true, output: 'text' }));

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No AI prompts available for the project'));
    });

    test('prints empty message when no prompts found', async () => {
      output = createOutput({ ...globalOptions, output: 'text' });

      await createAiPromptCommand().listAction(createCommandContext({ output: 'text' }));

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No AI prompts found'));
    });
  });
});
