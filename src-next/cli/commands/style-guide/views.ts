import type { StyleGuidesModel } from '@crowdin/crowdin-api-client';
import { colors } from '@/cli/utils/colors.ts';
import type { View } from '@/cli/utils/output.ts';

// `projectIds` and `languageIds` travel as comma-joined strings, so the verbose listing stays a toon table too.
export type FlatStyleGuide = Omit<StyleGuidesModel.StyleGuide, 'projectIds' | 'languageIds'> & {
  projectIds: string;
  languageIds: string;
};

export const flattenStyleGuide = (guide: StyleGuidesModel.StyleGuide): FlatStyleGuide => ({
  ...guide,
  projectIds: (guide.projectIds ?? []).join(','),
  languageIds: (guide.languageIds ?? []).join(','),
});

const scope = (guide: FlatStyleGuide): string =>
  guide.isShared ? 'shared' : `projects: ${guide.projectIds ? guide.projectIds.split(',').length : 0}`;

export function createStyleGuideView({ verbose = false }: { verbose?: boolean } = {}): View<FlatStyleGuide> {
  return {
    text: (guide) =>
      [
        `${colors.yellow(`#${guide.id}`)} ${guide.name} (${colors.green(scope(guide))})`,
        ...(verbose
          ? [
              `\tlanguages: ${guide.languageIds.replaceAll(',', ', ') || 'all'}`,
              `\tprojects: ${guide.projectIds.replaceAll(',', ', ') || '-'}`,
              `\tAI instructions: ${guide.aiInstructions ? 'yes' : 'no'}`,
            ]
          : []),
      ].join('\n'),
    plain: (guide) => guide.name,
    keys: verbose
      ? ['id', 'name', 'isShared', 'updatedAt', 'projectIds', 'languageIds']
      : ['id', 'name', 'isShared', 'updatedAt'],
  };
}
