import path from 'node:path';
import type { BunFile } from 'bun';
import type { Client } from '@crowdin/crowdin-api-client';
import { toCliError } from '../errors/CliError.ts';

export class StorageService {
  constructor(
    private apiClient: Client,
  ) {}

  async addStorage(file: BunFile) {
    try {
      const fileInfo = path.parse(file.name as string);
      return await this.apiClient.uploadStorageApi.addStorage(fileInfo.base, await file.text(), file.type);
    } catch (error) {
      throw toCliError(error, `Failed to upload ${file.name}`);
    }
  }
}
