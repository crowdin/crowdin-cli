import { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import type { View } from '@/cli/utils/output.ts';

type Project = ProjectsGroupsModel.Project;

// Java ProjectListAction formats lastActivity as an ISO date-time.
function formatLastActivity(lastActivity: unknown): string {
  if (!lastActivity) {
    return '';
  }

  if (lastActivity instanceof Date) {
    return lastActivity.toISOString();
  }

  const parsedDate = new Date(String(lastActivity));

  if (Number.isNaN(parsedDate.getTime())) {
    return String(lastActivity);
  }

  return parsedDate.toISOString();
}

// Java message.project.list. ProjectListAction has no plain branch, so plain renders like text.
export const projectView: View<Project> = {
  text: (project) => `#${project.id} ${project.name}`,
};

// message.project.list.verbose adds type, visibility and last activity. Enterprise omits
// visibility, which Java defaults to 'private'.
export const projectVerboseView: View<Project> = {
  text: (project) =>
    `#${project.id} ${project.name} ${
      project.type === ProjectsGroupsModel.Type.STRINGS_BASED ? 'string-based' : 'file-based'
    } ${(project.visibility ?? 'private').toString().toLowerCase()} ${formatLastActivity(project.lastActivity)}`,
};
