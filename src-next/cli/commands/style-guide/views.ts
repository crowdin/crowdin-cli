import type { StyleGuidesModel } from '@crowdin/crowdin-api-client';
import { colors } from '@/cli/utils/colors.ts';
import type { View } from '@/cli/utils/output.ts';

const scope = (guide: StyleGuidesModel.StyleGuide): string =>
  guide.isShared ? 'shared' : `projects: ${guide.projectIds?.length ?? 0}`;

/**
 * One line per style guide and, when verbose, its assignments indented underneath. Plain prints the
 * name alone.
 */
export function createStyleGuideView({
  verbose = false,
}: {
  verbose?: boolean;
} = {}): View<StyleGuidesModel.StyleGuide> {
  return {
    text: (guide) =>
      [
        `${colors.yellow(`#${guide.id}`)} ${guide.name} (${colors.green(scope(guide))})`,
        ...(verbose
          ? [
              `\tlanguages: ${guide.languageIds?.join(', ') || 'all'}`,
              `\tprojects: ${guide.projectIds?.join(', ') || '-'}`,
              `\tAI instructions: ${guide.aiInstructions ? 'yes' : 'no'}`,
            ]
          : []),
      ].join('\n'),
    plain: (guide) => guide.name,
    // The array keys only come with --verbose, so the default listing stays a toon table. The AI
    // instructions stay out: the text line only says whether they are set, and the body can run to kilobytes.
    keys: verbose
      ? ['id', 'name', 'isShared', 'updatedAt', 'projectIds', 'languageIds']
      : ['id', 'name', 'isShared', 'updatedAt'],
  };
}
