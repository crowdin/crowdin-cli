import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  fullContext,
  getAiContextSection,
  getManualContext,
  getStringText,
  readContextRecords,
} from '@/cli/utils/aiContext.ts';

const CONTEXT_WITH_AI = 'This is the manual context.\n\n✨ AI Context\nThis is the AI context.\n✨ 🔚';

describe('aiContext', () => {
  describe('getManualContext', () => {
    test('extracts the manual part from a combined context', () => {
      expect(getManualContext(CONTEXT_WITH_AI)).toBe('This is the manual context.');
    });

    test('returns the whole context when no AI section is present', () => {
      expect(getManualContext('This is the manual context.')).toBe('This is the manual context.');
    });

    test('returns an empty string for empty or missing context', () => {
      expect(getManualContext('')).toBe('');
      expect(getManualContext(undefined)).toBe('');
      expect(getManualContext(null)).toBe('');
    });
  });

  describe('getAiContextSection', () => {
    test('extracts the AI section from a combined context', () => {
      expect(getAiContextSection(CONTEXT_WITH_AI)).toBe('This is the AI context.');
    });

    test('returns an empty string when no AI section is present', () => {
      expect(getAiContextSection('This is the manual context.')).toBe('');
    });

    test('returns an empty string for empty or missing context', () => {
      expect(getAiContextSection('')).toBe('');
      expect(getAiContextSection(undefined)).toBe('');
      expect(getAiContextSection(null)).toBe('');
    });
  });

  describe('fullContext', () => {
    test('combines manual and AI context', () => {
      expect(fullContext('manual', 'ai')).toBe('manual\n\n✨ AI Context\nai\n✨ 🔚');
    });

    test('returns only the manual context when AI context is empty', () => {
      expect(fullContext('manual', '')).toBe('manual');
      expect(fullContext('manual', undefined)).toBe('manual');
    });

    test('roundtrips with the extractors', () => {
      const combined = fullContext('manual', 'ai');

      expect(getManualContext(combined)).toBe('manual');
      expect(getAiContextSection(combined)).toBe('ai');
    });
  });

  describe('getStringText', () => {
    test('returns plain string text as is', () => {
      expect(getStringText('hello')).toBe('hello');
    });

    test('flattens plural text the same way as the Java CLI', () => {
      expect(getStringText({ one: 'apple', other: 'apples' })).toBe('one: apple | other: apples');
    });

    test('returns an empty string for missing text', () => {
      expect(getStringText(undefined)).toBe('');
    });
  });

  describe('readContextRecords', () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'crowdin-ai-context-'));
    });

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true });
    });

    test('reads records from a jsonl file', async () => {
      const filePath = join(tempDir, 'context.jsonl');
      await writeFile(
        filePath,
        [
          '{"id":11,"key":"k1","text":"t1","file":"/f1","context":"man1","ai_context":"ai1"}',
          '{"id":22,"key":"k2","text":"t2","file":"/f2","context":"","ai_context":""}',
        ].join('\n'),
      );

      const records = await readContextRecords(filePath);

      expect(records).toEqual([
        { id: 11, key: 'k1', text: 't1', file: '/f1', context: 'man1', ai_context: 'ai1' },
        { id: 22, key: 'k2', text: 't2', file: '/f2', context: '', ai_context: '' },
      ]);
    });

    test('skips invalid and incomplete lines', async () => {
      const filePath = join(tempDir, 'context.jsonl');
      await writeFile(
        filePath,
        [
          'not json at all',
          '{"id":"string-id","key":"k","text":"t","file":"f","context":"c","ai_context":"a"}',
          '{"id":33,"key":"k3"}',
          '{"id":44,"key":"k4","text":"t4","file":"/f4","context":"man4","ai_context":"ai4"}',
          '',
        ].join('\n'),
      );

      const records = await readContextRecords(filePath);

      expect(records).toEqual([{ id: 44, key: 'k4', text: 't4', file: '/f4', context: 'man4', ai_context: 'ai4' }]);
    });
  });
});
