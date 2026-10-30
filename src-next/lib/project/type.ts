import { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';

export const FILE_MANAGEMENT_UNAVAILABLE = 'File management is not available for string-based projects';

export function isStringsBasedProject(project: Pick<ProjectsGroupsModel.Project, 'type'>): boolean {
  return project.type === ProjectsGroupsModel.Type.STRINGS_BASED;
}
