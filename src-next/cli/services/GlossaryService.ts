import type { Client, GlossariesModel } from '@crowdin/crowdin-api-client';
import CliError, { toCliError } from '../errors/CliError.ts';
import type { Output } from '../utils/output.ts';

export class GlossaryService {
  constructor(
    private apiClient: Client,
    private output: Output,
  ) {}

  async list(): Promise<GlossariesModel.Glossary[]> {
    try {
      const response = await this.apiClient.glossariesApi.withFetchAll().listGlossaries();
      return response.data.map((entry) => entry.data);
    } catch (error) {
      throw toCliError(error, 'Failed to list glossaries');
    }
  }

  async get(id: number): Promise<GlossariesModel.Glossary> {
    try {
      const response = await this.apiClient.glossariesApi.getGlossary(id);
      return response.data;
    } catch (error) {
      throw toCliError(error, `Failed to get glossary #${id}`);
    }
  }

  async add(request: GlossariesModel.CreateGlossaryRequest): Promise<GlossariesModel.Glossary> {
    try {
      const response = await this.apiClient.glossariesApi.addGlossary(request);
      return response.data;
    } catch (error) {
      throw toCliError(error, `Failed to add glossary '${request.name}'`);
    }
  }

  // Unlike the Java CLI, the term list is capped: glossaries can hold millions
  // of terms and fetching them all just for the verbose listing hangs the CLI
  async listTerms(glossaryId: number, maxTerms = 500): Promise<GlossariesModel.Term[]> {
    try {
      const response = await this.apiClient.glossariesApi.withFetchAll(maxTerms).listTerms(glossaryId);
      return response.data.map((entry) => entry.data);
    } catch (error) {
      throw toCliError(error, `Failed to list terms of glossary #${glossaryId}`);
    }
  }

  async export(glossaryId: number, format?: GlossariesModel.GlossaryFormat): Promise<string> {
    const request: GlossariesModel.ExportGlossaryRequest = {
      ...(format !== undefined ? { format } : {}),
    };

    this.output.spinner('glossary-export', 'start', 'Building glossary');

    try {
      let status = (await this.apiClient.glossariesApi.exportGlossary(glossaryId, request)).data;

      while (status.status !== 'finished') {
        if (status.status === 'failed') {
          throw new CliError('The build has failed');
        }

        this.output.spinner('glossary-export', 'message', `Building glossary (${status.progress}%)`);
        await Bun.sleep(1000);

        status = (await this.apiClient.glossariesApi.checkGlossaryExportStatus(glossaryId, status.identifier)).data;
      }

      this.output.spinner('glossary-export', 'stop', 'Building glossary (100%)');

      return status.identifier;
    } catch (error) {
      this.output.spinner('glossary-export', 'error', 'Failed to build the glossary');
      throw toCliError(error, 'Failed to build the glossary');
    }
  }

  async getDownloadUrl(glossaryId: number, exportId: string): Promise<string> {
    try {
      const response = await this.apiClient.glossariesApi.downloadGlossary(glossaryId, exportId);
      return response.data.url;
    } catch (error) {
      throw toCliError(error, 'Failed to download glossary');
    }
  }

  async import(glossaryId: number, request: GlossariesModel.GlossaryFile): Promise<void> {
    try {
      await this.apiClient.glossariesApi.importGlossaryFile(glossaryId, request);
    } catch (error) {
      throw toCliError(error, 'Failed to import glossary');
    }
  }
}
