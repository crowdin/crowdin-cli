import type { SourceStringsModel } from '@crowdin/crowdin-api-client';

const AI_CONTEXT_SECTION_START = '\n\n✨ AI Context\n';
const AI_CONTEXT_SECTION_END = '\n✨ 🔚';

// Mirrors the jsonl record produced by the Java CLI ('crowdin context download')
export interface StringContextRecord {
  id: number;
  key: string;
  text: string;
  file: string;
  context: string;
  ai_context: string;
}

export function getManualContext(context?: string | null): string {
  if (!context) {
    return '';
  }

  const startIndex = context.indexOf(AI_CONTEXT_SECTION_START);

  if (startIndex !== -1) {
    return context.substring(0, startIndex).trim();
  }

  return context.trim();
}

export function getAiContextSection(context?: string | null): string {
  if (!context) {
    return '';
  }

  const startIndex = context.indexOf(AI_CONTEXT_SECTION_START);
  const endIndex = context.indexOf(AI_CONTEXT_SECTION_END);

  if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
    return context.substring(startIndex + AI_CONTEXT_SECTION_START.length, endIndex);
  }

  return '';
}

export function fullContext(manualContext: string, aiContext?: string | null): string {
  let result = manualContext.trim();

  if (aiContext) {
    result += `${AI_CONTEXT_SECTION_START}${aiContext.trim()}${AI_CONTEXT_SECTION_END}`;
  }

  return result;
}

export async function readContextRecords(filePath: string): Promise<StringContextRecord[]> {
  const content = await Bun.file(filePath).text();

  return content
    .split('\n')
    .map((line) => parseContextRecord(line))
    .filter((record): record is StringContextRecord => record !== null);
}

// Invalid or incomplete lines are silently skipped, same as the Java CLI
function parseContextRecord(line: string): StringContextRecord | null {
  try {
    const parsed: unknown = JSON.parse(line);

    if (parsed === null || typeof parsed !== 'object') {
      return null;
    }

    const record = parsed as Record<string, unknown>;

    if (
      typeof record.id !== 'number' ||
      typeof record.key !== 'string' ||
      typeof record.text !== 'string' ||
      typeof record.file !== 'string' ||
      typeof record.context !== 'string' ||
      typeof record.ai_context !== 'string'
    ) {
      return null;
    }

    return {
      id: record.id,
      key: record.key,
      text: record.text,
      file: record.file,
      context: record.context,
      ai_context: record.ai_context,
    };
  } catch {
    return null;
  }
}

// Plural texts are flattened to 'form: value | form: value', same as the Java CLI
export function getStringText(text: string | SourceStringsModel.PluralText | undefined): string {
  if (typeof text === 'string') {
    return text;
  }

  if (!text || typeof text !== 'object') {
    return '';
  }

  return Object.entries(text)
    .map(([form, value]) => `${form}: ${value}`)
    .join(' | ');
}
