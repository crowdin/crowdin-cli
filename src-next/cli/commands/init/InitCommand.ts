import { existsSync } from 'node:fs';
import path from 'node:path';
import { autocomplete, confirm, isCancel, password, text } from '@clack/prompts';
import { Client } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { dump as dumpYaml, load as loadYaml } from 'js-yaml';
import AuthorizationError from '@/cli/errors/AuthorizationError.ts';
import CliError from '@/cli/errors/CliError.ts';
import { toCliError } from '@/cli/errors/toCliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { GetOutput } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { colors } from '@/cli/utils/colors.ts';
import { openUrl } from '@/cli/utils/open.ts';
import type { Output } from '@/cli/utils/output.ts';
import { buildUserAgent } from '@/cli/utils/userAgent.ts';
import { generate } from '@/lib/config/yamlGenerator.ts';
import patterns, { validTranslationPattern } from '@/lib/export/patterns.ts';
import { DEFAULT_IDENTITY_FILE, getIdentityFilePath } from '@/lib/identityFiles.ts';
import { getOrganization } from '@/lib/organization/credentials.ts';
import { basePath, baseUrl, noPreserveHierarchy, projectId, source, token, translation } from '../common/options.ts';
import { getAuthorizationUrl, startBrowserAuthorization } from './browserAuthServer.ts';
import { destination, quiet } from './options.ts';

interface InitCommandOptions extends GlobalOptions {
  destination: string;
  token?: string;
  projectId?: number;
  basePath?: string;
  baseUrl: string;
  source?: string;
  translation?: string;
  preserveHierarchy: boolean;
  quiet: boolean;
}

export default class InitCommand {
  private get successMessage(): string {
    return (
      'Your configuration skeleton has been successfully generated. ' +
      'Specify your source and translation paths in the files section. ' +
      'For more details see https://crowdin.github.io/crowdin-cli/configuration\n\n' +
      colors.bold('Next steps: ') +
      "run 'crowdin push' to upload sources and 'crowdin pull' to download translations."
    );
  }

  constructor(private getOutput: GetOutput) {}

  getDefinition(): CommandDef {
    return {
      name: 'init',
      description: 'Generate Crowdin CLI configuration skeleton',
      action: this.defaultAction,
      options: [destination, token, projectId, basePath, baseUrl, source, translation, noPreserveHierarchy, quiet],
    };
  }

  defaultAction = async (command: Command) => {
    const options = command.optsWithGlobals() as InitCommandOptions;
    const output = this.getOutput(command);
    const configFilePath = path.join(process.cwd(), options.destination);

    output.intro(`Generating Crowdin CLI configuration skeleton '${configFilePath}'`);

    if (await Bun.file(configFilePath).exists()) {
      const existsMessage =
        `File '${configFilePath}' already exists. ` +
        `Fill it out accordingly to the following requirements: ` +
        `https://developer.crowdin.com/configuration-file/#configuration-file-structure`;

      if (options.quiet) {
        output.outro(existsMessage);
        return;
      }

      if (!(await this.confirmOverwrite(configFilePath, output))) {
        output.outro(existsMessage);
        return;
      }
    }

    if (options.quiet) {
      const config = generate({
        projectId: options.projectId ?? '',
        apiToken: options.token,
        basePath: options.basePath ?? '',
        baseUrl: options.baseUrl || 'https://api.crowdin.com',
        preserveHierarchy: options.preserveHierarchy,
        ignoreHiddenFiles: true,
        files: [{ source: options.source ?? '', translation: options.translation ?? '' }],
      });

      await Bun.write(configFilePath, config);

      output.outro(this.successMessage);
      return;
    }

    let apiToken: string | undefined = options.token ?? undefined;
    let domain: string | undefined = options.baseUrl ? getOrganization(options.baseUrl) : undefined;

    if (apiToken === undefined) {
      const savedToken = await this.readSavedToken();

      if (savedToken !== undefined && (await this.confirmUseSavedToken(output))) {
        apiToken = savedToken;
      }
    }

    let authorizedViaBrowser = false;

    if (apiToken === undefined) {
      const authorization = await this.authorizeViaBrowser(output);

      if (authorization) {
        authorizedViaBrowser = true;
        apiToken = authorization.accessToken;
        domain = authorization.domain ?? undefined;
      }
    }

    if (!authorizedViaBrowser && domain === undefined && (await this.isEnterprise(output))) {
      domain = await this.getEnterpriseDomain(output);
    }

    let apiClient: Client;

    if (apiToken === undefined) {
      // Interactive token entry: let an invalid token be re-typed instead of aborting the whole init.
      const verified = await this.promptForVerifiedToken(domain, output);
      apiToken = verified.token;
      apiClient = verified.client;
    } else {
      apiClient = this.createApiClient(apiToken, domain);
      await this.getAuthorizedUser(apiClient, output);
    }

    const project = await this.selectProject(apiClient, options, output);
    const projectDirectory = await this.selectProjectDirectory(options, output);
    const sourcePattern = await this.selectSourcePattern(options, output);
    const translationPattern = await this.selectTranslationPattern(options, output);
    const apiTokenWritten = await this.writeApiToken(apiToken);

    const config = generate({
      projectId: project.data.id,
      apiToken: apiTokenWritten ? undefined : apiToken,
      basePath: projectDirectory,
      baseUrl: domain ? `https://${domain}.api.crowdin.com` : options.baseUrl || 'https://api.crowdin.com',
      preserveHierarchy: options.preserveHierarchy,
      ignoreHiddenFiles: true,
      files: [
        {
          source: sourcePattern,
          translation: translationPattern,
        },
      ],
    });

    await Bun.write(configFilePath, config);

    output.outro(this.successMessage);
  };

  private async confirmOverwrite(configFilePath: string, output: Output): Promise<boolean> {
    const overwrite = await confirm({
      message: `File '${configFilePath}' already exists. Overwrite?`,
      initialValue: false,
    });
    this.cancelHandler(overwrite, output);

    return overwrite as boolean;
  }

  private async getToken(output: Output) {
    const apiToken = (await password({ message: 'API token:' })) as string;
    this.cancelHandler(apiToken, output);

    return apiToken;
  }

  private async promptForVerifiedToken(
    domain: string | undefined,
    output: Output,
  ): Promise<{ token: string; client: Client }> {
    while (true) {
      const token = await this.getToken(output);
      const client = this.createApiClient(token, domain);

      try {
        await this.getAuthorizedUser(client, output);
        return { token, client };
      } catch (error) {
        // A bad token is recoverable here (the user can retype it); anything else aborts.
        if (error instanceof AuthorizationError) {
          output.error(error.message);
          continue;
        }

        throw error;
      }
    }
  }

  private createApiClient(token: string, domain: string | undefined): Client {
    return new Client({ token, organization: domain }, { userAgent: buildUserAgent() });
  }

  private async readSavedToken(): Promise<string | undefined> {
    const apiTokenFilePath = getIdentityFilePath(DEFAULT_IDENTITY_FILE);

    try {
      if (!(await Bun.file(apiTokenFilePath).exists())) {
        return undefined;
      }

      const existing = (loadYaml(await Bun.file(apiTokenFilePath).text()) as Record<string, unknown>) ?? {};
      const savedToken = existing.api_token;

      return typeof savedToken === 'string' && savedToken.length > 0 ? savedToken : undefined;
    } catch {
      return undefined;
    }
  }

  private async confirmUseSavedToken(output: Output): Promise<boolean> {
    const useSaved = await confirm({ message: `Use the API token saved in '${DEFAULT_IDENTITY_FILE}'?` });
    this.cancelHandler(useSaved, output);

    return useSaved as boolean;
  }

  private async authorizeViaBrowser(output: Output) {
    const confirmation = await confirm({ message: 'Authorize via browser?' });
    this.cancelHandler(confirmation, output);

    if (!confirmation) {
      return null;
    }

    const authorizationUrl = getAuthorizationUrl();
    const authorization = startBrowserAuthorization();

    if (!openUrl(authorizationUrl)) {
      output.warning(`Error opening a web browser. Please open the following link manually:\n${authorizationUrl}`);
    }

    output.spinner('browserAuth', 'start', 'Waiting for authorization in browser...');

    try {
      const result = await authorization;
      output.spinner('browserAuth', 'stop', 'Browser authorization finished successfully');

      return result;
    } catch (error) {
      output.spinner('browserAuth', 'error', 'Browser authorization failed');
      throw error;
    }
  }

  private async isEnterprise(output: Output) {
    const confirmation = await confirm({
      message: 'For Crowdin Enterprise?',
      initialValue: false,
    });
    this.cancelHandler(confirmation, output);

    return confirmation as boolean;
  }

  private async getEnterpriseDomain(output: Output): Promise<string> {
    const input = (await text({
      message: 'Your organization name:',
      validate: (value) => (value ? undefined : 'Organization name is required'),
    })) as string;
    this.cancelHandler(input, output);

    // Accept a pasted organization URL, not just the bare name
    const organization = getOrganization(input) ?? input;

    if (organization !== input) {
      output.info(`Extracted organization name from provided url: ${organization}`);
    }

    return organization;
  }

  private async getAuthorizedUser(apiClient: Client, output: Output) {
    output.spinner('authorization', 'start', 'Authorizing...');

    try {
      const user = await apiClient.usersApi.getAuthenticatedUser();

      output.spinner('authorization', 'stop', `Authorized as ${user.data.username}`);

      return user;
    } catch (error) {
      output.spinner('authorization', 'error', 'Authorization failed');
      throw toCliError(error, 'Authorization failed');
    }
  }

  private async selectProject(apiClient: Client, options: InitCommandOptions, output: Output) {
    let projectId = options.projectId || null;

    if (projectId === null) {
      // biome-ignore format: manual formatting looks better
      const projects = await apiClient
        .projectsGroupsApi
        .withFetchAll()
        .listProjects({ hasManagerAccess: 1 });

      if (projects.data.length === 0) {
        throw new CliError('No projects with manager access found. Create a project in Crowdin first.', 1, true);
      }

      projectId = (await autocomplete({
        message: 'Select project:',
        placeholder: 'Type to search...',
        options: projects.data.map((project) => ({
          value: project.data.id,
          label: project.data.name,
          hint: `#${project.data.id}`,
        })),
        maxItems: 10,
      })) as number;

      this.cancelHandler(projectId, output);
    }

    output.spinner('projectValidation', 'start', 'Validating project...');

    try {
      const project = await apiClient.projectsGroupsApi.getProject(Number(projectId));

      output.spinner('projectValidation', 'stop', 'Project validation was successful');

      return project;
    } catch (error) {
      output.spinner('projectValidation', 'error', 'Project validation failed');
      throw toCliError(error, 'Project validation failed');
    }
  }

  private async selectProjectDirectory(options: InitCommandOptions, output: Output) {
    if (options.basePath) {
      return options.basePath;
    }

    const projectDirectory = (await text({
      message: 'Your project directory (press Enter for the current directory):',
      placeholder: '.',
      defaultValue: '.',
      validate: (value) => this.validateProjectDirectory(value ?? ''),
    })) as string;

    this.cancelHandler(projectDirectory, output);

    return projectDirectory;
  }

  private validateProjectDirectory(value: string): string | undefined {
    const absolutePath = path.resolve(value);
    return existsSync(absolutePath) ? undefined : `Path '${absolutePath}' doesn't exist`;
  }

  private async selectSourcePattern(options: InitCommandOptions, output: Output) {
    if (options.source) {
      return options.source;
    }

    const sourcePattern = await text({
      message: 'Source pattern:',
      placeholder: '/locales/en/**/*.json',
    });

    this.cancelHandler(sourcePattern, output);

    return sourcePattern as string;
  }

  private async selectTranslationPattern(options: InitCommandOptions, output: Output) {
    if (options.translation) {
      return options.translation;
    }

    const translationPattern = (await text({
      message: `Translation pattern (supported placeholders: ${patterns.join(', ')}):`,
      placeholder: '/resources/%two_letters_code%/%original_file_name%',
      validate: (value) => this.validateTranslationPattern(value ?? ''),
    })) as string;

    this.cancelHandler(translationPattern, output);

    return translationPattern;
  }

  private validateTranslationPattern(value: string): string | undefined {
    if (!value || validTranslationPattern(value)) {
      return undefined;
    }

    return `Translation pattern '${value}' contains invalid placeholders`;
  }

  protected async writeApiToken(apiToken: string): Promise<boolean> {
    const apiTokenFilePath = getIdentityFilePath(DEFAULT_IDENTITY_FILE);

    try {
      let existing: Record<string, unknown> = {};

      if (await Bun.file(apiTokenFilePath).exists()) {
        existing = (loadYaml(await Bun.file(apiTokenFilePath).text()) as Record<string, unknown>) ?? {};
      }

      existing.api_token = apiToken;

      await Bun.write(apiTokenFilePath, dumpYaml(existing));

      return true;
    } catch {
      return false;
    }
  }

  private cancelHandler(value: unknown, output: Output): void {
    if (isCancel(value)) {
      output.cancel('Operation cancelled.');
      throw new CliError('Operation cancelled.', 0, true);
    }
  }
}
