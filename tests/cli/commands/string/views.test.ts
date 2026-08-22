import { describe, expect, test } from 'bun:test';
import type { SourceStringsModel } from '@crowdin/crowdin-api-client';
import { createStringView, extractText } from '@/cli/commands/string/views.ts';

describe('string views', () => {
  const createString = (overrides: Partial<SourceStringsModel.String> = {}): SourceStringsModel.String =>
    ({ id: 11, identifier: 'welcome', text: 'Hello', ...overrides }) as SourceStringsModel.String;

  const verboseContext = {
    verbose: true,
    isStringsBased: false,
    labels: new Map([[9, 'marketing']]),
    filePaths: new Map([[101, { path: '/content.md' }]]),
  };

  describe('headline', () => {
    test('renders id, identifier and text', () => {
      expect(createStringView().text(createString())).toBe('#11 welcome Hello');
    });

    test('drops the identifier when the string has none', () => {
      // Java falls back to message.source_string_list_text_short.
      expect(createStringView().text(createString({ identifier: undefined }))).toBe('#11 Hello');
    });

    test('prints the id alone in plain', () => {
      expect(createStringView().plain?.(createString())).toBe('11');
    });
  });

  describe('verbose details', () => {
    test('appends file, labels and context as indented lines', () => {
      const entry = createString({ fileId: 101, labelIds: [9], context: 'Greeting' });

      expect(createStringView(verboseContext).text(entry)).toBe(
        '#11 welcome Hello\n\t- file: /content.md\n\t- labels: marketing\n\t- context: Greeting',
      );
    });

    test('appends the same details in plain, under the bare id', () => {
      const entry = createString({ fileId: 101, labelIds: [9], context: 'Greeting' });

      expect(createStringView(verboseContext).plain?.(entry)).toBe(
        '11\n\t- file: /content.md\n\t- labels: marketing\n\t- context: Greeting',
      );
    });

    // The branch is a line of its own, so a listing that spans branches says which branch a string
    // is in without the path carrying a prefix.
    test('adds a branch line for a string in a branch', () => {
      const entry = createString({ fileId: 101 });
      const context = {
        ...verboseContext,
        filePaths: new Map([[101, { path: '/content.md', branch: 'feature' }]]),
      };

      expect(createStringView(context).text(entry)).toBe(
        '#11 welcome Hello\n\t- file: /content.md\n\t- branch: feature',
      );
    });

    test('skips the file line for strings-based projects', () => {
      const entry = createString({ fileId: 101, context: 'Greeting' });

      expect(createStringView({ ...verboseContext, isStringsBased: true }).text(entry)).toBe(
        '#11 welcome Hello\n\t- context: Greeting',
      );
    });

    test('drops labels that no longer resolve', () => {
      const entry = createString({ labelIds: [9, 404] });

      expect(createStringView(verboseContext).text(entry)).toBe('#11 welcome Hello\n\t- labels: marketing');
    });

    test('indents wrapped context lines', () => {
      const entry = createString({ context: '  first\nsecond  ' });

      expect(createStringView(verboseContext).text(entry)).toBe('#11 welcome Hello\n\t- context: first\n\t\tsecond');
    });

    test('emits no detail lines when not verbose', () => {
      const entry = createString({ fileId: 101, labelIds: [9], context: 'Greeting' });

      expect(createStringView().text(entry)).toBe('#11 welcome Hello');
    });
  });

  describe('extractText', () => {
    test('returns a plain string as is', () => {
      expect(extractText(createString())).toBe('Hello');
    });

    test('prefers the "one" plural form, then "other", then the first value', () => {
      expect(extractText(createString({ text: { one: 'One', other: 'Other' } }))).toBe('One');
      expect(extractText(createString({ text: { other: 'Other' } }))).toBe('Other');
      expect(extractText(createString({ text: { few: 'Few' } }))).toBe('Few');
    });

    test('falls back to an empty string when there is no text', () => {
      expect(extractText(createString({ text: undefined }))).toBe('');
    });
  });
});
