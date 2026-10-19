import { describe, expect, test } from 'bun:test';
import type { AiModel } from '@crowdin/crowdin-api-client';
import { createAiPromptView } from '@/cli/commands/ai-prompt/views.ts';

describe('AI prompt views', () => {
  const createPrompt = (overrides: Partial<AiModel.AiPromptResponse> = {}) =>
    ({
      id: 42,
      name: 'Pre-translate',
      action: 'pre_translate',
      isEnabled: true,
      enabledProjectIds: [1, 2],
      aiProviderId: 5,
      aiModelId: 'gpt-4o',
      lastUsedAt: '2026-10-01T10:00:00+00:00',
      ...overrides,
    }) as AiModel.AiPromptResponse;

  test('renders id, name and action', () => {
    expect(createAiPromptView().text(createPrompt())).toBe('#42 Pre-translate (pre_translate)');
  });

  test('marks a disabled prompt', () => {
    expect(createAiPromptView().text(createPrompt({ isEnabled: false }))).toBe(
      '#42 Pre-translate (pre_translate, disabled)',
    );
  });

  test('indents projects, provider, model and last use when verbose', () => {
    const view = createAiPromptView({ verbose: true });

    expect(view.text(createPrompt())).toBe(
      '#42 Pre-translate (pre_translate)\n\tprojects: 1, 2\n\tprovider: 5\n\tmodel: gpt-4o\n\tlast used: 2026-10-01T10:00:00+00:00',
    );
    expect(view.text(createPrompt({ aiProviderId: null, aiModelId: null, lastUsedAt: null }))).toBe(
      '#42 Pre-translate (pre_translate)\n\tprojects: 1, 2\n\tprovider: -\n\tmodel: -\n\tlast used: never',
    );
  });

  test('tells a prompt allowed everywhere from one allowed nowhere', () => {
    const view = createAiPromptView({ verbose: true });

    expect(view.text(createPrompt({ enabledProjectIds: null as never }))).toContain('\tprojects: all');
    expect(view.text(createPrompt({ enabledProjectIds: [] }))).toContain('\tprojects: -');
  });

  test('prints id then name in plain', () => {
    expect(createAiPromptView({ verbose: true }).plain?.(createPrompt())).toBe('42 Pre-translate');
  });
});
