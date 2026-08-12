import { describe, expect, test } from 'bun:test';
import { type ProgressRow, statusPlainView, statusVerboseView, toProgressMap } from '@/cli/commands/status/views.ts';

describe('status views', () => {
  const row = (overrides: Partial<ProgressRow> = {}): ProgressRow => ({
    languageId: 'fr',
    name: 'French',
    translation: 87,
    approval: 75,
    words: { total: 138, translated: 120, approved: 103, preTranslateAppliedTo: 0 },
    phrases: { total: 34, translated: 30, approved: 26, preTranslateAppliedTo: 0 },
    ...overrides,
  });

  describe('percent map', () => {
    test('keys both sections by language', () => {
      expect(toProgressMap([row()], 'all')).toEqual({ translation: { fr: '87%' }, proofread: { fr: '75%' } });
    });

    test('omits the section the view does not show', () => {
      expect(toProgressMap([row()], 'translated')).toEqual({ translation: { fr: '87%' } });
      expect(toProgressMap([row()], 'proofread')).toEqual({ proofread: { fr: '75%' } });
    });
  });

  describe('verbose', () => {
    const map = toProgressMap([row()], 'all');

    test('renders a header per language, then both progress lines', () => {
      expect(statusVerboseView([row()], 'all').text(map)).toBe(
        'French(fr):\n' +
          '\tTranslated: 87% (Words: 120/138, Phrases: 30/34)\n' +
          '\tProofread: 75% (Words: 103/138, Phrases: 26/34)',
      );
    });

    test('drops the line the view does not show', () => {
      expect(statusVerboseView([row()], 'proofread').text(map)).toBe(
        'French(fr):\n\tProofread: 75% (Words: 103/138, Phrases: 26/34)',
      );
    });

    test('falls back to the language id when the project has no name for it', () => {
      expect(statusVerboseView([row({ name: 'uk', languageId: 'uk' })], 'translated').text(map)).toContain('uk(uk):');
    });

    test('counts as zero when the API omits words and phrases', () => {
      const bare = row({ words: undefined, phrases: undefined });

      expect(statusVerboseView([bare], 'translated').text(map)).toBe(
        'French(fr):\n\tTranslated: 87% (Words: 0/0, Phrases: 0/0)',
      );
    });
  });

  describe('plain', () => {
    const map = toProgressMap([row()], 'all');

    test('heads each section only when both are shown', () => {
      expect(statusPlainView([row()], 'all').text(map)).toBe('Translated:\nfr 87\nProofread:\nfr 75');
    });

    test('prints bare lines for a single section', () => {
      expect(statusPlainView([row()], 'translated').text(map)).toBe('fr 87');
      expect(statusPlainView([row()], 'proofread').text(map)).toBe('fr 75');
    });
  });
});
