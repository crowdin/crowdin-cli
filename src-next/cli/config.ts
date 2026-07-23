import { statSync } from 'node:fs';
import path from 'node:path';
import type { Command } from 'commander';
import { load as loadYaml } from 'js-yaml';
import { z } from 'zod';
import NotFoundError from '@/cli/errors/NotFoundError.ts';
import { expandTilde } from '@/cli/utils/localPath.ts';
import InvalidConfigurationError from '@/lib/config/errors/InvalidConfigurationError.ts';
import { loadRawFromFile, mapConfig } from '@/lib/config/yamlLoader.ts';
import { assertProjectConfigured, type Config, ConfigSchema, type ProjectConfig } from '@/lib/config.ts';
import { getIdentityFilePath, IDENTITY_FILE_NAMES } from '@/lib/identityFiles.ts';
import type { ConfigOptions, GlobalOptions } from './options.ts';
import type { Output } from './utils/output.ts';

// Default config files, matching Java's BaseCli.DEFAULT_CONFIGS. When --config is omitted, the
// first existing one in the cwd is used; if neither exists, crowdin.yml is returned so the ensuing
// load surfaces a not-found error naming it.
const DEFAULT_CONFIG_FILES = ['crowdin.yml', 'crowdin.yaml'] as const;

type LoadedConfig = { config: Config; fromFile: boolean };

export function createGetConfig(getOutput: (command: Command) => Output) {
  let cachedLoad: LoadedConfig | undefined;
  let cachedConfigPath: string | undefined;

  // Java's BaseProperties: the config file is read when present, but credentials may come entirely
  // from flags or the environment, so a missing default file is not an error. Only the files tier
  // (and an explicit --config) insists the file be there.
  const loadConfig = async (command: Command): Promise<LoadedConfig> => {
    const output = getOutput(command);
    const options = command.optsWithGlobals() as GlobalOptions & ConfigOptions;
    const configPath = await resolveConfigPath(options.config);

    if (cachedLoad && cachedConfigPath === configPath) {
      return cachedLoad;
    }

    output.debug(`Loading configuration from ${configPath} file`);

    const readConfigFile = await needsConfigFile(command, options, configPath);
    const raw = readConfigFile ? await loadRawFromFile(configPath) : {};
    const identity = await identityLayer(options, output);

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
      identity ?? {},
      cliLayer(options, isFilesTier(command)),
    ]);

    // Java resolves base_path relative to the config file's directory, expanding a leading `~`
    // (BaseProperties.populateWithDefaultValues).
    config.basePath = resolveBasePath(config.basePath, configPath);

    cachedLoad = { config, fromFile: readConfigFile || identity !== undefined };
    cachedConfigPath = configPath;

    return cachedLoad;
  };

  const getConfig = async (command: Command): Promise<Config> => {
    const { config, fromFile } = await loadConfig(command);

    checkResolvedConfig(config, command, fromFile);

    return config;
  };

  // Java's ProjectProperties. checkResolvedConfig already reports a missing project_id for every
  // command that declares --project-id, so this only narrows the type for the services that read it.
  const getProjectConfig = async (command: Command): Promise<ProjectConfig> => {
    const config = await getConfig(command);

    assertProjectConfigured(config);

    return config;
  };

  return { getConfig, getProjectConfig };
}

// The checks Java defers until every source is merged and base_path is resolved
// (BaseProperties/ProjectProperties.checkProperties). Java collects them into one ValidationException
// rather than failing on the first, so a single run tells you everything that needs fixing.
function checkResolvedConfig(config: Config, command: Command, fromFile: boolean): void {
  const errors: string[] = [];
  const basePath = statSync(config.basePath, { throwIfNoEntry: false });

  if (!basePath) {
    errors.push(
      `The base path ${config.basePath} was not found. Check your 'base_path' for possible typos and/or capitalization mismatches`,
    );
  } else if (!basePath.isDirectory()) {
    errors.push(`The base path '${config.basePath}' should be a directory. Specify the path to your project directory`);
  }

  if (requiresProjectId(command) && config.projectId === undefined) {
    errors.push("Required option 'project_id' is missing");
  }

  if (errors.length === 0) {
    return;
  }

  // Java picks the title by whether any file was read at all (PropertiesBuilder.build).
  const title = fromFile
    ? 'Configuration file is invalid. Check the following parameters in your configuration file:'
    : 'Configuration is invalid. Check the following parameters:';

  throw new InvalidConfigurationError([title, ...errors.map((error) => `\t- ${error}`)].join('\n'));
}

// Mirrors Java PropertiesBuilders: the file tier reads the config file when it exists or when no
// --source/--translation pair replaces it (ParamsWithFiles.isEmpty), other tiers only when it exists.
// An explicit --config always must resolve, so a missing one still surfaces a not-found error.
async function needsConfigFile(
  command: Command,
  options: GlobalOptions & ConfigOptions,
  configPath: string,
): Promise<boolean> {
  if (options.config || (await Bun.file(configPath).exists())) {
    return true;
  }

  return isFilesTier(command) && !options.source && !options.translation;
}

// The command's own option set is the tier marker, the way Java's params tier is fixed by the
// subcommand's ArgGroup: only filesConfigGroup carries --source, and only the project/files groups
// carry --project-id (see cli/commands/common/options.ts), so this cannot drift from the tiers
// declared there.
//
// The file-tier --source is a single string pattern (non-variadic, matching ConfigSchema.files[].source:
// z.string()). bundle add/clone declare their own variadic --source (a pattern list) with the same
// attribute name, which is NOT a file-override source — so key off the option's shape, not just its
// name, otherwise bundle's array value crashes ConfigSchema at files[0].source.
function isFilesTier(command: Command): boolean {
  return command.options.some((option) => option.attributeName() === 'source' && !option.variadic);
}

function requiresProjectId(command: Command): boolean {
  return hasOption(command, 'projectId');
}

function hasOption(command: Command, attributeName: string): boolean {
  return command.options.some((option) => option.attributeName() === attributeName);
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
  return path.resolve(path.dirname(configPath), expandTilde(basePath));
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
// Returns undefined when no identity file was read, which (with the config file) decides whether an
// invalid config is reported as "Configuration file is invalid" or "Configuration is invalid".
async function identityLayer(
  options: GlobalOptions & ConfigOptions,
  output: Output,
): Promise<Record<string, unknown> | undefined> {
  let identityPath = options.identity;

  if (identityPath) {
    if (!(await Bun.file(identityPath).exists())) {
      throw new NotFoundError(`Identity file not found: ${identityPath}`);
    }
  } else {
    identityPath = await firstExistingDefaultIdentityFile();
  }

  if (!identityPath) {
    return undefined;
  }

  output.debug(`Loading credentials from ${identityPath} file`);

  // Java tolerates an empty identity file (unlike an empty config file), so parse leniently.
  const parsed = loadYaml(await Bun.file(identityPath).text());

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
function cliLayer(options: GlobalOptions & ConfigOptions, filesTier: boolean): Partial<Config> {
  const layer: Partial<Config> = {
    apiToken: options.token,
    basePath: options.basePath,
    baseUrl: options.baseUrl,
    projectId: options.projectId,
    preserveHierarchy: options.preserveHierarchy,
  };

  // Only file-tier commands turn --source/--translation into a single-file override. Other commands
  // (bundle add/clone) reuse those names for their own unrelated options, so leave their values alone.
  if (!filesTier) {
    return layer;
  }

  if (options.source && options.translation) {
    layer.files = [
      {
        source: options.source,
        translation: options.translation,
        ...(options.dest ? { dest: options.dest } : {}),
      },
    ];

    if (options.dest) {
      layer.preserveHierarchy = true;
    }
  } else {
    // Mirrors Java PropertiesWithFilesBuilder: --source/--translation must come as a pair, and --dest
    // is meaningless without both. Accumulate like Java's messages.addError so both surface at once.
    const errors: string[] = [];

    if (Boolean(options.source) !== Boolean(options.translation)) {
      errors.push("Both the 'source' and the 'translation' must be specified in the parameters");
    }

    if (options.dest) {
      errors.push("'dest' must be specified with both 'source' and 'translation' parameters");
    }

    if (errors.length > 0) {
      throw new InvalidConfigurationError(errors.join('\n'));
    }
  }

  return layer;
}
