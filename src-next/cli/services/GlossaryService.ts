import type { Client, GlossariesModel } from '@crowdin/crowdin-api-client';
import { pollUntilFinished } from '@/lib/api/pollStatus.ts';
import { toCliError } from '../errors/toCliError.ts';
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

    this.output.spinner('glossaryExport', 'start', 'Building glossary');

    try {
      const started = await this.apiClient.glossariesApi.exportGlossary(glossaryId, request);
      const finished = await pollUntilFinished(
        started,
        (identifier) => this.apiClient.glossariesApi.checkGlossaryExportStatus(glossaryId, identifier),
        'The build has failed',
        (status) => this.output.spinner('glossaryExport', 'message', `Building glossary (${status.progress}%)`),
      );

      this.output.spinner('glossaryExport', 'stop', 'Building glossary (100%)');

      return finished.data.identifier;
    } catch (error) {
      this.output.spinner('glossaryExport', 'error', 'Failed to build the glossary');
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
