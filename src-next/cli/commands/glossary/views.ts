import type { GlossariesModel } from '@crowdin/crowdin-api-client';
import { toSingleLine } from '@/cli/commands/common/views.ts';
import type { View } from '@/cli/utils/output.ts';

const termLine = (term: GlossariesModel.Term): string =>
  `\t#${term.id} ${term.text}: ${toSingleLine(term.description ?? '')}`;

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
