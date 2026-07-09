import type { ProjectsGroupsModel, ResponseObject } from '@crowdin/crowdin-api-client';

/**
 * Whether the loaded project response carries manager/developer-level fields.
 *
 * The API only returns settings-bearing fields (e.g. `languageMapping`) when the current user has
 * manager or developer access, so their presence doubles as the role check. As a type guard it also
 * narrows `project.data` to the settings variant, exposing `languageMapping` and friends.
 */
export function hasManagerAccess(
  project: ResponseObject<ProjectsGroupsModel.Project | ProjectsGroupsModel.ProjectSettings>,
): project is ResponseObject<ProjectsGroupsModel.ProjectSettings> {
  return 'languageMapping' in project.data;
}
