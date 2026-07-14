import os from 'node:os';
import path from 'node:path';
import type { Command } from 'commander';
import YAML from 'yaml';
import { z } from 'zod';
import NotFoundError from '@/cli/errors/NotFoundError.ts';
import InvalidConfigurationError from '@/lib/config/errors/InvalidConfigurationError.ts';
import { loadRawFromFile, mapConfig } from '@/lib/config/yamlLoader.ts';
import { type Config, ConfigSchema } from '@/lib/config.ts';
import { getIdentityFilePath, IDENTITY_FILE_NAMES } from '@/lib/identityFiles.ts';
import type { ConfigOptions, GlobalOptions } from './options.ts';
import type { Output } from './utils/output.ts';

// Default config files, matching Java's BaseCli.DEFAULT_CONFIGS. When --config is omitted, the
// first existing one in the cwd is used; if neither exists, crowdin.yml is returned so the ensuing
// load surfaces a not-found error naming it.
const DEFAULT_CONFIG_FILES = ['crowdin.yml', 'crowdin.yaml'] as const;

export function createGetConfig(getOutput: (command: Command) => Output) {
  let cachedConfig: Config | undefined;
  let cachedConfigPath: string | undefined;

  return async (command: Command): Promise<Config> => {
    const output = getOutput(command);
    const options = command.optsWithGlobals() as GlobalOptions & ConfigOptions;
    const configPath = await resolveConfigPath(options.config);

    if (cachedConfig && cachedConfigPath === configPath) {
      return cachedConfig;
    }

    output.debug(`Loading configuration from ${configPath} file`);

    const raw = await loadRawFromFile(configPath);

    // Single resolution pipeline, lowest priority first. Every scenario — CROWDIN_* fallback,
    // config file, `*_env` vars, ~/.crowdin.yml token, --identity file, CLI flags — is a layer
    // here; assembleConfig folds and validates them into a ready-to-use Config.
    //
    // Env resolution is two layers straddling the config file (Java PropertiesBuilder precedence):
    // `*_env` outranks a literal key, CROWDIN_* underranks it. Bun auto-loads `.env` into
    // process.env, so `.env` and shell vars are both covered natively.
    const config = assembleConfig([
      envFallbackLayer(),
      mapConfig(raw),
      envKeyLayer(raw),
      await identityLayer(options, output),
      cliLayer(options),
    ]);

    // Java resolves base_path relative to the config file's directory, expanding a leading `~`
    // (BaseProperties.populateWithDefaultValues). Skip Java's toRealPath/exists check so config
    // validation stays filesystem-independent.
    config.basePath = resolveBasePath(config.basePath, configPath);

    cachedConfig = config;
    cachedConfigPath = configPath;

    return cachedConfig;
  };
}

async function resolveConfigPath(explicit: string | undefined): Promise<string> {
  if (explicit) {
    return explicit;
  }

  for (const fileName of DEFAULT_CONFIG_FILES) {
    const candidate = path.join(process.cwd(), fileName);

    if (await Bun.file(candidate).exists()) {
      return candidate;
    }
  }

  return path.join(process.cwd(), DEFAULT_CONFIG_FILES[0]);
}

function resolveBasePath(basePath: string, configPath: string): string {
  const expanded = basePath.startsWith('~') ? os.homedir() + basePath.slice(1) : basePath;

  return path.resolve(path.dirname(configPath), expanded);
}

// Folds credential/config layers lowest-priority-first into a single validated Config.
// `undefined` values never clobber a lower layer, so each caller passes only the keys it has;
// the last layer to set a key wins. This is the one place config is validated (exit 2 on failure).
function assembleConfig(layers: Array<Record<string, unknown>>): Config {
  const merged: Record<string, unknown> = {};

  for (const layer of layers) {
    for (const [key, value] of Object.entries(layer)) {
      if (value !== undefined) {
        merged[key] = value;
      }
    }
  }

  const parsed = ConfigSchema.safeParse(merged);

  // Java throws ValidationException (exit 2) for an invalid config; surface zod errors as the same.
  if (!parsed.success) {
    throw new InvalidConfigurationError(z.prettifyError(parsed.error), { cause: parsed.error });
  }

  return parsed.data;
}

// CROWDIN_* shell fallbacks — the lowest layer, so any literal/`*_env`/override wins over them.
function envFallbackLayer(): Record<string, unknown> {
  return {
    projectId: process.env.CROWDIN_PROJECT_ID,
    apiToken: process.env.CROWDIN_PERSONAL_TOKEN,
    basePath: process.env.CROWDIN_BASE_PATH,
    baseUrl: process.env.CROWDIN_BASE_URL,
  };
}

// `*_env` config keys — sit above the config file's literal keys (a `<key>_env` names the variable
// to read and wins over the literal `<key>`), but below token/identity/CLI overrides.
function envKeyLayer(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    projectId: envVar(raw, 'project_id_env'),
    apiToken: envVar(raw, 'api_token_env'),
    basePath: envVar(raw, 'base_path_env'),
    baseUrl: envVar(raw, 'base_url_env'),
  };
}

// Reads the shell/.env variable named by a `<key>_env` config value, or undefined if unset/absent.
function envVar(raw: Record<string, unknown>, envKey: string): string | undefined {
  return raw[envKey] != null ? process.env[String(raw[envKey])] : undefined;
}

// Resolves the four credential fields from a raw map, `<key>_env` winning over the literal `<key>`.
function credentialLayer(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    projectId: envVar(raw, 'project_id_env') ?? raw.project_id,
    apiToken: envVar(raw, 'api_token_env') ?? raw.api_token,
    basePath: envVar(raw, 'base_path_env') ?? raw.base_path,
    baseUrl: envVar(raw, 'base_url_env') ?? raw.base_url,
  };
}

// Identity credentials, matching Java's identity-file handling. The file is `--identity` when given,
// otherwise the first existing default (~/.crowdin.yml, then ~/.crowdin.yaml). It contributes all
// four credential fields (with `*_env` resolution), overriding the config file but not CLI flags.
// A `--identity` file that does not exist is an error; missing default files are simply skipped.
async function identityLayer(options: GlobalOptions & ConfigOptions, output: Output): Promise<Record<string, unknown>> {
  let identityPath = options.identity;

  if (identityPath) {
    if (!(await Bun.file(identityPath).exists())) {
      throw new NotFoundError(`Identity file not found: ${identityPath}`);
    }
  } else {
    identityPath = await firstExistingDefaultIdentityFile();
  }

  if (!identityPath) {
    return {};
  }

  output.debug(`Loading credentials from ${identityPath} file`);

  // Java tolerates an empty identity file (unlike an empty config file), so parse leniently.
  const parsed = YAML.parse(await Bun.file(identityPath).text());

  return parsed && typeof parsed === 'object' ? credentialLayer(parsed as Record<string, unknown>) : {};
}

async function firstExistingDefaultIdentityFile(): Promise<string | undefined> {
  for (const fileName of IDENTITY_FILE_NAMES) {
    const candidate = getIdentityFilePath(fileName);

    if (await Bun.file(candidate).exists()) {
      return candidate;
    }
  }

  return undefined;
}

// CLI flag overrides. Mirrors Java's PropertiesWithFilesBuilder: --source/--translation build a
// single-file override, and --dest folds into that same file (also forcing preserve_hierarchy on).
function cliLayer(options: GlobalOptions & ConfigOptions): Partial<Config> {
  const layer: Partial<Config> = {
    apiToken: options.token,
    basePath: options.basePath,
    baseUrl: options.baseUrl,
    projectId: options.projectId,
    preserveHierarchy: options.preserveHierarchy,
  };

  if (options.source && options.translation) {
    layer.files = [
      {
        source: options.source,
        translation: options.translation,
        ...(options.destination ? { dest: options.destination } : {}),
      },
    ];

    if (options.destination) {
      layer.preserveHierarchy = true;
    }
  }

  return layer;
}
