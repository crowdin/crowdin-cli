import { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import { colors } from '@/cli/utils/colors.ts';
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
  text: (project) => `${colors.yellow(`#${project.id}`)} ${colors.green(project.name)}`,
  keys: ['id', 'name'],
};

/**
 * The `project add` echo. Same line as the listing in text, but Java's ProjectAddAction has a plain
 * branch the listing lacks (`out.println(project.getId())`), so plain prints the bare id — the one
 * field a script needs from a project it just created.
 */
export const projectAddView: View<Project> = {
  text: projectView.text,
  plain: (project) => String(project.id),
  keys: projectView.keys,
};

// message.project.list.verbose adds type, visibility and last activity. Enterprise omits
// visibility, which Java defaults to 'private'.
export const projectVerboseView: View<Project> = {
  text: (project) =>
    `${colors.yellow(`#${project.id}`)} ${colors.green(project.name)} ${colors.green(
      project.type === ProjectsGroupsModel.Type.STRINGS_BASED ? 'string-based' : 'file-based',
    )} ${colors.red((project.visibility ?? 'private').toString().toLowerCase())} ${colors.blue(
      formatLastActivity(project.lastActivity),
    )}`,
  keys: ['id', 'name', 'type', 'visibility', 'lastActivity'],
};
