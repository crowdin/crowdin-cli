import { Client as ApiClient, type ProjectsGroupsModel, type SourceFilesModel } from '@crowdin/crowdin-api-client';

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

  async listProjects(hasManagerAccess: boolean = true, offset: number = 0, limit: number = 25) {
    return await this.apiClient.projectsGroupsApi.listProjects({
      hasManagerAccess: +hasManagerAccess,
      offset,
      limit
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

  async createProjectDirectory(projectId: number, name: string, directoryId?: number) {
    return await this.apiClient.sourceFilesApi.createDirectory(projectId, {
      name,
      directoryId,
    });
  }

  async listProjectDirectories(projectId: number) {
    return await this.apiClient.sourceFilesApi.listProjectDirectories(projectId);
  }

  async listProjectBranches(projectId: number): Promise<{ data: unknown[] }> {
    const sourceFilesApi = this.apiClient.sourceFilesApi as unknown as {
      listProjectBranches: (projectId: number) => Promise<{ data: unknown[] }>;
    };

    return await sourceFilesApi.listProjectBranches(projectId);
  }

  async addProjectFile(
    projectId: number,
    storageId: number,
    fileName: string,
    directoryId?: number,
    exportPattern?: string,
    type?: SourceFilesModel.FileType,
    parserVersion?: number,
  ) {
    return this.apiClient.sourceFilesApi.createFile(projectId, {
      storageId,
      name: fileName,
      directoryId,
      type,
      parserVersion,
      exportOptions: { exportPattern },
    });
  }

  async updateProjectFile(projectId: number, fileId: number, storageId: number, exportPattern?: string) {
    return await this.apiClient.sourceFilesApi.updateOrRestoreFile(projectId, fileId, {
      storageId,
      exportOptions: { exportPattern },
    });
  }

  async deleteProjectFile(projectId: number, fileId: number) {
    return await this.apiClient.sourceFilesApi.deleteFile(projectId, fileId);
  }

  async downloadProjectFile(projectId: number, fileId: number) {
    return await this.apiClient.sourceFilesApi.downloadFile(projectId, fileId);
  }

  async listProjectFiles(projectId: number) {
    return await this.apiClient.sourceFilesApi.listProjectFiles(projectId);
  }

  async importProjectTranslation(projectId: number, storageId: number, fileId: number, languageIds: string[]) {
    return await this.apiClient.translationsApi.importTranslations(projectId, {
      storageId,
      fileId,
      languageIds,
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

  async addStorage(fileName: string, fileContent: any, contentType?: string) {
    return await this.apiClient.uploadStorageApi.addStorage(fileName, fileContent, contentType);
  }

  async getStorage(storageId: number) {
    return await this.apiClient.uploadStorageApi.getStorage(storageId);
  }
}
