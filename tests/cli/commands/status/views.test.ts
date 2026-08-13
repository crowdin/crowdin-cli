import { beforeAll, describe, expect, test } from 'bun:test';
import {
  type ProgressRow,
  statusPlainVerboseView,
  statusPlainView,
  statusTableView,
  toProgressMap,
} from '@/cli/commands/status/views.ts';
import { enableColors } from '@/cli/utils/colors.ts';

describe('status views', () => {
  // colors default to on; the views are asserted as raw strings, so switch them off like fileTree.test.ts
  beforeAll(() => {
    enableColors(false);
  });

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
      expect(statusPlainVerboseView([row()], 'all').text(map)).toBe(
        'French(fr):\n' +
          '\tTranslated: 87% (Words: 120/138, Phrases: 30/34)\n' +
          '\tProofread: 75% (Words: 103/138, Phrases: 26/34)',
      );
    });

    test('drops the line the view does not show', () => {
      expect(statusPlainVerboseView([row()], 'proofread').text(map)).toBe(
        'French(fr):\n\tProofread: 75% (Words: 103/138, Phrases: 26/34)',
      );
    });

    test('falls back to the language id when the project has no name for it', () => {
      expect(statusPlainVerboseView([row({ name: 'uk', languageId: 'uk' })], 'translated').text(map)).toContain(
        'uk(uk):',
      );
    });

    test('counts as zero when the API omits words and phrases', () => {
      const bare = row({ words: undefined, phrases: undefined });

      expect(statusPlainVerboseView([bare], 'translated').text(map)).toBe(
        'French(fr):\n\tTranslated: 87% (Words: 0/0, Phrases: 0/0)',
      );
    });
  });

  describe('table', () => {
    test('keys each language by name and code, one percentage column per section', () => {
      expect(statusTableView([row()], 'all')).toEqual({
        'French(fr)': { Translated: '87%', Proofread: '75%' },
      });
    });

    test('adds the counts when verbose', () => {
      expect(statusTableView([row()], 'all', true)).toEqual({
        'French(fr)': {
          Translated: '87%',
          'Translated words': '120/138',
          'Translated phrases': '30/34',
          Proofread: '75%',
          'Proofread words': '103/138',
          'Proofread phrases': '26/34',
        },
      });
    });

    test('drops the columns the view does not show', () => {
      expect(statusTableView([row()], 'proofread', true)).toEqual({
        'French(fr)': { Proofread: '75%', 'Proofread words': '103/138', 'Proofread phrases': '26/34' },
      });
    });

    test('counts as zero when the API omits words and phrases', () => {
      expect(statusTableView([row({ words: undefined, phrases: undefined })], 'translated', true)).toEqual({
        'French(fr)': { Translated: '87%', 'Translated words': '0/0', 'Translated phrases': '0/0' },
      });
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
