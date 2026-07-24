import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';
import { normalize } from '../helpers/normalize.ts';
import { type SuiteContext, setupSuite, teardownSuite } from '../helpers/suite.ts';

describe('auto update', () => {
  let ctx: SuiteContext;

  beforeAll(async () => {
    ctx = await setupSuite('auto-update');
  });

  afterAll(async () => {
    await teardownSuite(ctx);
  });

  test('uploads sources, creating both files', async () => {
    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/1_android.xml'");
    expect(result.stdout).toContain("File 'sources/2_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  test('updates existing sources and creates a new one (auto-update is the default)', async () => {
    await copyFile(join(ctx.workspace, 'sources_rev2/1_android.xml'), join(ctx.workspace, 'sources/1_android.xml'));
    await copyFile(join(ctx.workspace, 'sources_rev2/2_android.xml'), join(ctx.workspace, 'sources/2_android.xml'));
    await copyFile(join(ctx.workspace, 'sources_rev2/3_android.xml'), join(ctx.workspace, 'sources/3_android.xml'));

    const result = await ctx.runner.run(['upload', 'sources']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("File 'sources/1_android.xml'");
    expect(result.stdout).toContain("File 'sources/2_android.xml'");
    expect(result.stdout).toContain("File 'sources/3_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });

  // Known-broken as of 2026-07-20 — left red intentionally as a regression marker, do not "fix" the
  // assertions to match the current buggy behavior. Root cause: Commander.js turns the `--no-auto-update`
  // flag into `autoUpdate: false`, not `noAutoUpdate` (its own `--no-x` negation convention), but
  // UploadSourcesCommand reads `options.noAutoUpdate` — always undefined — so the flag has no effect and
  // every existing file gets updated anyway.
  test('skips existing sources but still creates a new one with --no-auto-update', async () => {
    await copyFile(join(ctx.workspace, 'sources_rev2/4_android.xml'), join(ctx.workspace, 'sources/4_android.xml'));

    const result = await ctx.runner.run(['upload', 'sources', '--no-auto-update']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('File sources/1_android.xml already exists and will not be updated');
    expect(result.stdout).toContain('File sources/2_android.xml already exists and will not be updated');
    expect(result.stdout).toContain('File sources/3_android.xml already exists and will not be updated');
    expect(result.stdout).toContain("File 'sources/4_android.xml'");
    expect(normalize(result.stdout)).toMatchSnapshot();
  });
});
