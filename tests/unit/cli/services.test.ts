import { describe, expect, mock, test } from 'bun:test';
import type { Client } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { StyleGuideService } from '@/cli/services/StyleGuideService.ts';
import { createGetStyleGuideService } from '@/cli/services.ts';

describe('createGetStyleGuideService', () => {
  test('builds the service once from the command and reuses it', async () => {
    const getApiClient = mock(async () => ({}) as Client);
    const command = {} as Command;
    const getStyleGuideService = createGetStyleGuideService(getApiClient);

    const first = await getStyleGuideService(command);
    const second = await getStyleGuideService(command);

    expect(first).toBeInstanceOf(StyleGuideService);
    expect(second).toBe(first);
    expect(getApiClient).toHaveBeenCalledTimes(1);
    expect(getApiClient).toHaveBeenCalledWith(command);
  });
});
