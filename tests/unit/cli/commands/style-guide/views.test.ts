import { describe, expect, test } from 'bun:test';
import type { StyleGuidesModel } from '@crowdin/crowdin-api-client';
import { createStyleGuideView, flattenStyleGuide } from '@/cli/commands/style-guide/views.ts';

describe('style guide views', () => {
  const createGuide = (overrides: Partial<StyleGuidesModel.StyleGuide> = {}) =>
    flattenStyleGuide({
      id: 42,
      name: 'forty-two',
      isShared: false,
      projectIds: [1, 2],
      languageIds: null,
      aiInstructions: null,
      ...overrides,
    } as StyleGuidesModel.StyleGuide);

  test('joins project and language ids into comma-separated strings', () => {
    expect(createGuide({ languageIds: ['uk', 'de'] })).toMatchObject({ projectIds: '1,2', languageIds: 'uk,de' });
    expect(createGuide({ projectIds: null })).toMatchObject({ projectIds: '', languageIds: '' });
  });

  test('renders id, name and project count', () => {
    expect(createStyleGuideView().text(createGuide())).toBe('#42 forty-two (projects: 2)');
    expect(createStyleGuideView().text(createGuide({ projectIds: null }))).toBe('#42 forty-two (projects: 0)');
  });

  test('marks a shared guide', () => {
    expect(createStyleGuideView().text(createGuide({ isShared: true }))).toBe('#42 forty-two (shared)');
  });

  test('indents assignments and AI instructions when verbose', () => {
    const view = createStyleGuideView({ verbose: true });

    expect(view.text(createGuide({ languageIds: ['uk', 'de'], aiInstructions: 'Be brief' }))).toBe(
      '#42 forty-two (projects: 2)\n\tlanguages: uk, de\n\tprojects: 1, 2\n\tAI instructions: yes',
    );
    expect(view.text(createGuide({ isShared: true, projectIds: [] }))).toBe(
      '#42 forty-two (shared)\n\tlanguages: all\n\tprojects: -\n\tAI instructions: no',
    );
  });

  test('prints the name alone in plain', () => {
    expect(createStyleGuideView({ verbose: true }).plain?.(createGuide())).toBe('forty-two');
  });
});
