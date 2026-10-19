import type { AiModel } from '@crowdin/crowdin-api-client';
import { colors } from '@/cli/utils/colors.ts';
import type { View } from '@/cli/utils/output.ts';

type AiPrompt = AiModel.AiPromptResponse;

// The API sends null for a prompt allowed in every project; an empty list allows none.
const projects = ({ enabledProjectIds }: AiPrompt): string =>
  enabledProjectIds === null ? 'all' : enabledProjectIds.join(', ') || '-';

export function createAiPromptView({ verbose = false }: { verbose?: boolean } = {}): View<AiPrompt> {
  return {
    text: (prompt) =>
      [
        `${colors.yellow(`#${prompt.id}`)} ${prompt.name} (${colors.green(prompt.action)}${prompt.isEnabled ? '' : ', disabled'})`,
        ...(verbose
          ? [
              `\tprojects: ${projects(prompt)}`,
              `\tprovider: ${prompt.aiProviderId ?? '-'}`,
              `\tmodel: ${prompt.aiModelId ?? '-'}`,
              `\tlast used: ${prompt.lastUsedAt ?? 'never'}`,
            ]
          : []),
      ].join('\n'),
    plain: (prompt) => `${prompt.id} ${prompt.name}`,
    keys: verbose
      ? ['id', 'name', 'action', 'isEnabled', 'enabledProjectIds', 'aiProviderId', 'aiModelId', 'lastUsedAt']
      : ['id', 'name', 'action', 'isEnabled'],
  };
}
