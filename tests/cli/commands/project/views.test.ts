import { describe, expect, test } from 'bun:test';
import type { ProjectsGroupsModel } from '@crowdin/crowdin-api-client';
import { projectVerboseView, projectView } from '@/cli/commands/project/views.ts';

describe('project views', () => {
  const createProject = (overrides: Partial<ProjectsGroupsModel.Project> = {}): ProjectsGroupsModel.Project =>
    ({ id: 1, name: 'Docs', ...overrides }) as ProjectsGroupsModel.Project;

  test('renders id and name', () => {
    expect(projectView.text(createProject())).toBe('#1 Docs');
  });

  test('renders type, visibility and last activity when verbose', () => {
    const project = createProject({
      type: 1 as ProjectsGroupsModel.Type,
      visibility: 'OPEN',
      lastActivity: '2025-01-01T10:00:00.000Z',
    });

    expect(projectVerboseView.text(project)).toBe('#1 Docs string-based open 2025-01-01T10:00:00.000Z');
  });

  test('defaults to file-based and private, as Java does for enterprise responses', () => {
    expect(projectVerboseView.text(createProject())).toBe('#1 Docs file-based private ');
  });

  test('normalizes a Date last activity to ISO', () => {
    const project = createProject({ lastActivity: new Date('2025-01-01T10:00:00.000Z') as unknown as string });

    expect(projectVerboseView.text(project)).toBe('#1 Docs file-based private 2025-01-01T10:00:00.000Z');
  });

  test('passes an unparseable last activity through unchanged', () => {
    expect(projectVerboseView.text(createProject({ lastActivity: 'not-a-date' }))).toBe(
      '#1 Docs file-based private not-a-date',
    );
  });

  test('has no plain override, since Java ProjectListAction has no plain branch', () => {
    expect(projectView.plain).toBeUndefined();
    expect(projectVerboseView.plain).toBeUndefined();
  });
});
