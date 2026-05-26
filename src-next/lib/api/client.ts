import {
  Client as ApiClient,
  type ProjectsGroupsModel,
  type SourceFilesModel,
} from '@crowdin/crowdin-api-client';

export interface Credentials {
  token: string;
  organization?: string;
}

export default class Client {
  private readonly apiClient: ApiClient;

  constructor(credentials: Credentials) {
    this.apiClient = new ApiClient({
      token: credentials.token,
      organization: credentials?.organization || undefined,
    });
  }

  async getAuthenticatedUser() {
    return await this.apiClient.usersApi.getAuthenticatedUser();
  }

  async listProjects(hasManagerAccess: boolean = true, offset?: number, limit?: number) {
    return await this.apiClient.projectsGroupsApi.listProjects({
      hasManagerAccess: +hasManagerAccess,
      offset,
      limit,
    });
  }

  async listSupportedLanguages() {
    return await this.apiClient.languagesApi.withFetchAll().listSupportedLanguages();
  }

  async addProject(
    name: string,
    sourceLanguageId: string,
    targetLanguageIds: string[],
    languageAccessPolicy: ProjectsGroupsModel.LanguageAccessPolicy = 'moderate',
    _stringBased: boolean = false, // TODO: It looks like this is not possible with current CLI client
  ) {
    return await this.apiClient.projectsGroupsApi.addProject({
      name,
      sourceLanguageId,
      targetLanguageIds,
      languageAccessPolicy,
    });
  }

  async getProject(projectId: number) {
    return await this.apiClient.projectsGroupsApi.getProject(projectId);
  }

  async getProjectProgress(projectId: number) {
    return await this.apiClient.translationStatusApi.getProjectProgress(projectId);
  }

  async getBranchProgress(projectId: number, branchId: number): Promise<{ data: unknown[] }> {
    const translationStatusApi = this.apiClient.translationStatusApi as unknown as {
      getBranchProgress: (projectId: number, branchId: number) => Promise<{ data: unknown[] }>;
    };

    return await translationStatusApi.getBranchProgress(projectId, branchId);
  }

  async getFileProgress(projectId: number, fileId: number): Promise<{ data: unknown[] }> {
    const translationStatusApi = this.apiClient.translationStatusApi as unknown as {
      getFileProgress: (projectId: number, fileId: number) => Promise<{ data: unknown[] }>;
    };

    return await translationStatusApi.getFileProgress(projectId, fileId);
  }

  async getDirectoryProgress(projectId: number, directoryId: number): Promise<{ data: unknown[] }> {
    const translationStatusApi = this.apiClient.translationStatusApi as unknown as {
      getDirectoryProgress: (projectId: number, directoryId: number) => Promise<{ data: unknown[] }>;
    };

    return await translationStatusApi.getDirectoryProgress(projectId, directoryId);
  }

  async listProjectLabels(projectId: number) {
    return await this.apiClient.labelsApi.listLabels(projectId);
  }

  async addProjectLabel(projectId: number, title: string) {
    return await this.apiClient.labelsApi.addLabel(projectId, { title });
  }

  async listProjectBranches(projectId: number, name?: string, limit?: number) {
    return await this.apiClient.sourceFilesApi.listProjectBranches(projectId, { name, limit });
  }

  async createProjectBranch(projectId: number, name: string) {
    return await this.apiClient.sourceFilesApi.createBranch(projectId, { name });
  }

  async createProjectDirectory(projectId: number, name: string, directoryId?: number, branchId?: number) {
    return await this.apiClient.sourceFilesApi.createDirectory(
      projectId,
      {
        name,
        directoryId,
        branchId,
      }
    );
  }

  async listProjectDirectories(projectId: number, branchId?: number, recursion?: string, limit?: number) {
    return await this.apiClient.sourceFilesApi.listProjectDirectories(
      projectId,
      {
        branchId,
        recursion,
        limit,
      }
    );
  }

  async deleteProjectDirectory(projectId: number, directoryId: number) {
    return await this.apiClient.sourceFilesApi.deleteDirectory(projectId, directoryId);
  }

  async addProjectFile(
    projectId: number,
    storageId: number,
    fileName: string,
    directoryId?: number,
    exportPattern?: string,
    type?: SourceFilesModel.FileType,
    parserVersion?: number,
    excludedTargetLanguages?: string[],
    attachLabelIds?: number[],
    branchId?: number,
  ) {
    return this.apiClient.sourceFilesApi.createFile(projectId, {
      storageId,
      name: fileName,
      directoryId,
      branchId,
      type,
      parserVersion,
      exportOptions: { exportPattern },
      excludedTargetLanguages,
      attachLabelIds,
    });
  }

  async updateProjectFile(
    projectId: number,
    fileId: number,
    storageId: number,
    exportPattern?: string,
    attachLabelIds?: number[],
  ) {
    return await this.apiClient.sourceFilesApi.updateOrRestoreFile(projectId, fileId, {
      storageId,
      exportOptions: { exportPattern },
      attachLabelIds,
    });
  }

  async editProjectFile(projectId: number, fileId: number, path: string, value: unknown) {
    return await this.apiClient.sourceFilesApi.editFile(projectId, fileId, [
      {
        op: 'replace',
        path: path,
        value: value,
      },
    ]);
  }

  async deleteProjectFile(projectId: number, fileId: number) {
    return await this.apiClient.sourceFilesApi.deleteFile(projectId, fileId);
  }

  async downloadProjectFile(projectId: number, fileId: number) {
    return await this.apiClient.sourceFilesApi.downloadFile(projectId, fileId);
  }

  async listProjectFiles(projectId: number, branchId?: number, recursion?: boolean, limit?: number, offset?: number) {
    return await this.apiClient.sourceFilesApi.listProjectFiles(projectId, {
      branchId,
      recursion,
      limit,
      offset,
    });
  }

  async importProjectTranslation(
    projectId: number,
    storageId: number,
    fileId: number,
    languageIds: string[],
    autoApproveImported?: boolean,
    importEqSuggestions?: boolean,
    translateHidden?: boolean,
  ) {
    return await this.apiClient.translationsApi.importTranslations(projectId, {
      storageId,
      fileId,
      languageIds,
      autoApproveImported,
      importEqSuggestions,
      translateHidden,
    });
  }

  async buildProjectTranslations(projectId: number, languageIds?: string[]) {
    return await this.apiClient.translationsApi.buildProject(projectId, {
      targetLanguageIds: languageIds,
    });
  }

  async getProjectTranslationsBuildStatus(projectId: number, buildId: number) {
    return await this.apiClient.translationsApi.checkBuildStatus(projectId, buildId);
  }

  async downloadProjectTranslations(projectId: number, buildId: number) {
    return await this.apiClient.translationsApi.downloadTranslations(projectId, buildId);
  }

  async addStorage(fileName: string, fileContent: unknown, contentType?: string) {
    return await this.apiClient.uploadStorageApi.addStorage(fileName, fileContent, contentType);
  }

  async getStorage(storageId: number) {
    return await this.apiClient.uploadStorageApi.getStorage(storageId);
  }
}
