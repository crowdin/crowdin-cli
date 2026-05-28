import path from 'node:path';
import type { Client } from '@crowdin/crowdin-api-client';
import type { BunFile } from 'bun';
import { toCliError } from '@/cli/errors/CliError.ts';

export class StorageService {
  constructor(private apiClient: Client) {}

  async addStorage(file: BunFile) {
    try {
      const fileInfo = path.parse(file.name as string);
      const content = new Uint8Array(await file.arrayBuffer());

      return await this.apiClient.uploadStorageApi.addStorage(fileInfo.base, content, file.type);
    } catch (error) {
      throw toCliError(error, `Failed to upload ${file.name}`);
    }
  }
}
