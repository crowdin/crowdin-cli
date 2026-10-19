import { describe, expect, mock, test } from 'bun:test';
import type { Client } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { AiService } from '@/cli/services/AiService.ts';
import { StyleGuideService } from '@/cli/services/StyleGuideService.ts';
import { createGetAiService, createGetStyleGuideService } from '@/cli/services.ts';

describe.each([
  ['createGetStyleGuideService', createGetStyleGuideService, StyleGuideService],
  ['createGetAiService', createGetAiService, AiService],
] as const)('%s', (_, createGetService, Service) => {
  test('builds the service once from the command and reuses it', async () => {
    const getApiClient = mock(async () => ({}) as Client);
    const command = {} as Command;
    const getService = createGetService(getApiClient);

    const first = await getService(command);
    const second = await getService(command);

    expect(first).toBeInstanceOf(Service);
    expect(second).toBe(first);
    expect(getApiClient).toHaveBeenCalledTimes(1);
    expect(getApiClient).toHaveBeenCalledWith(command);
  });
});
