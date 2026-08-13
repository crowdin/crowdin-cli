import { beforeAll, describe, expect, test } from 'bun:test';
import { type ProgressRow, statusPlainView, statusTableView, toProgressList } from '@/cli/commands/status/views.ts';
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

  describe('entry list', () => {
    test('carries both percentages per language', () => {
      expect(toProgressList([row()], 'all')).toEqual([{ language: 'fr', translation: 87, approval: 75 }]);
    });

    test('omits the percentage the view does not show', () => {
      expect(toProgressList([row()], 'translated')).toEqual([{ language: 'fr', translation: 87 }]);
      expect(toProgressList([row()], 'proofread')).toEqual([{ language: 'fr', approval: 75 }]);
    });

    test('adds the counts as columns when verbose', () => {
      expect(toProgressList([row()], 'all', true)).toEqual([
        {
          language: 'fr',
          translation: 87,
          approval: 75,
          translatedWords: 120,
          approvedWords: 103,
          totalWords: 138,
          translatedPhrases: 30,
          approvedPhrases: 26,
          totalPhrases: 34,
        },
      ]);
    });

    test('drops the columns the view does not show', () => {
      expect(toProgressList([row()], 'proofread', true)).toEqual([
        { language: 'fr', approval: 75, approvedWords: 103, totalWords: 138, approvedPhrases: 26, totalPhrases: 34 },
      ]);
    });

    // Every language has to yield the same keys, or toon falls back to one block per entry.
    test('keeps the columns uniform when the API omits words and phrases', () => {
      expect(
        toProgressList([row(), row({ languageId: 'de', words: undefined, phrases: undefined })], 'translated', true),
      ).toEqual([
        {
          language: 'fr',
          translation: 87,
          translatedWords: 120,
          totalWords: 138,
          translatedPhrases: 30,
          totalPhrases: 34,
        },
        { language: 'de', translation: 87, translatedWords: 0, totalWords: 0, translatedPhrases: 0, totalPhrases: 0 },
      ]);
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
    const map = toProgressList([row()], 'all');

    test('heads each section only when both are shown', () => {
      expect(statusPlainView([row()], 'all').text(map)).toBe('Translated:\nfr 87\nProofread:\nfr 75');
    });

    test('prints bare lines for a single section', () => {
      expect(statusPlainView([row()], 'translated').text(map)).toBe('fr 87');
      expect(statusPlainView([row()], 'proofread').text(map)).toBe('fr 75');
    });

    // Every line stays "<lang> <value>"; --verbose says what the value is with a section, not a column.
    test('adds a section per count when verbose', () => {
      expect(statusPlainView([row()], 'all', true).text(map)).toBe(
        'Translated:\nfr 87\n' +
          'Translated words:\nfr 120/138\n' +
          'Translated phrases:\nfr 30/34\n' +
          'Proofread:\nfr 75\n' +
          'Proofread words:\nfr 103/138\n' +
          'Proofread phrases:\nfr 26/34',
      );
    });

    test('heads the verbose sections of a single metric too', () => {
      expect(statusPlainView([row()], 'translated', true).text(map)).toBe(
        'Translated:\nfr 87\nTranslated words:\nfr 120/138\nTranslated phrases:\nfr 30/34',
      );
    });

    test('counts as zero when the API omits words and phrases', () => {
      expect(statusPlainView([row({ words: undefined, phrases: undefined })], 'proofread', true).text(map)).toBe(
        'Proofread:\nfr 75\nProofread words:\nfr 0/0\nProofread phrases:\nfr 0/0',
      );
    });

    test('lists every language under each section', () => {
      expect(statusPlainView([row(), row({ languageId: 'de', translation: 50 })], 'translated').text(map)).toBe(
        'fr 87\nde 50',
      );
    });
  });
});
