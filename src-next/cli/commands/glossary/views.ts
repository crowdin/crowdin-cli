import type { GlossariesModel } from '@crowdin/crowdin-api-client';
import type { View } from '@/cli/utils/output.ts';

const singleLine = (text: string): string => text.replaceAll('\n', ' ');

const termLine = (term: GlossariesModel.Term): string =>
  `\t#${term.id} ${term.text}: ${singleLine(term.description ?? '')}`;

/**
 * Java GlossaryListAction: one line per glossary and, when verbose, its terms indented underneath.
 * Terms come from a per-glossary request the command makes up front, so they are passed in.
 * Plain prints the name alone and never lists terms, as Java keeps that block inside !plainView.
 */
export function createGlossaryView({
  verbose = false,
  terms = new Map<number, GlossariesModel.Term[]>(),
}: {
  verbose?: boolean;
  terms?: Map<number, GlossariesModel.Term[]>;
} = {}): View<GlossariesModel.Glossary> {
  return {
    text: (glossary) =>
      [
        `#${glossary.id} ${glossary.name} (terms: ${glossary.terms ?? 0})`,
        ...(verbose ? (terms.get(glossary.id) ?? []).map(termLine) : []),
      ].join('\n'),
    plain: (glossary) => glossary.name,
  };
}
