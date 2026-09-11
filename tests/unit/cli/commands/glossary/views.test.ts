import { describe, expect, test } from 'bun:test';
import type { GlossariesModel } from '@crowdin/crowdin-api-client';
import { createGlossaryView } from '@/cli/commands/glossary/views.ts';

describe('glossary views', () => {
  const createGlossary = (overrides: Partial<GlossariesModel.Glossary> = {}): GlossariesModel.Glossary =>
    ({ id: 42, name: 'forty-two', terms: 2, ...overrides }) as GlossariesModel.Glossary;

  const createTerm = (overrides: Partial<GlossariesModel.Term> = {}): GlossariesModel.Term =>
    ({ id: 52, text: 'fifty-two', description: 'How', ...overrides }) as GlossariesModel.Term;

  test('renders id, name and term count', () => {
    expect(createGlossaryView().text(createGlossary())).toBe('#42 forty-two (terms: 2)');
  });

  test('falls back to zero when the term count is missing', () => {
    expect(createGlossaryView().text(createGlossary({ terms: undefined }))).toBe('#42 forty-two (terms: 0)');
  });

  test('indents the terms under their glossary when verbose', () => {
    const view = createGlossaryView({
      verbose: true,
      terms: new Map([[42, [createTerm(), createTerm({ id: 53, text: 'fifty-three', description: 'are\nyou' })]]]),
    });

    expect(view.text(createGlossary())).toBe(
      '#42 forty-two (terms: 2)\n\t#52 fifty-two: How\n\t#53 fifty-three: are you',
    );
  });

  test('renders a term with no description', () => {
    const view = createGlossaryView({
      verbose: true,
      terms: new Map([[42, [createTerm({ description: undefined })]]]),
    });

    expect(view.text(createGlossary())).toBe('#42 forty-two (terms: 2)\n\t#52 fifty-two: ');
  });

  test('renders the glossary alone when its terms could not be loaded', () => {
    // loadTerms leaves the glossary out of the map after a permission error.
    expect(createGlossaryView({ verbose: true }).text(createGlossary())).toBe('#42 forty-two (terms: 2)');
  });

  test('prints the name alone in plain, terms never included', () => {
    const view = createGlossaryView({ verbose: true, terms: new Map([[42, [createTerm()]]]) });

    expect(view.plain?.(createGlossary())).toBe('forty-two');
  });
});
