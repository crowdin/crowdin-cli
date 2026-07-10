import path from 'node:path';
import { confirm, isCancel, select, text } from '@clack/prompts';
import { Client } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { decodeJwt } from 'jose';
import YAML from 'yaml';
import CliError from '@/cli/errors/CliError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { GetOutput } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import { openUrl } from '@/cli/utils/open.ts';
import type { Output } from '@/cli/utils/output.ts';
import { buildUserAgent } from '@/cli/utils/userAgent.ts';
import { DEFAULT_FILE_NAME, getApiTokenFilePathFor } from '@/lib/apiToken.ts';
import { generate } from '@/lib/config/yamlGenerator.ts';
import patterns from '@/lib/export/patterns.ts';
import { basePath, baseUrl, noPreserveHierarchy, projectId, source, token, translation } from '../common/options.ts';
import { destination } from './options.ts';

const CROWDIN_OAUTH_CLIENT_ID = 'wQEqvhU3vLOa2XicmUyT';
const CROWDIN_OAUTH_HOST = 'localhost';
const CROWDIN_OAUTH_PORT = 46221;

interface InitCommandOptions extends GlobalOptions {
  destination: string;
  token?: string;
  projectId?: number;
  basePath?: string;
  baseUrl: string;
  source?: string;
  translation?: string;
  preserveHierarchy: boolean;
}

export default class InitCommand {
  constructor(private getOutput: GetOutput) {}

  getDefinition(): CommandDef {
    return {
      name: 'init',
      description: 'Generate Crowdin CLI configuration skeleton',
      action: this.defaultAction,
      options: [destination, token, projectId, basePath, baseUrl, source, translation, noPreserveHierarchy],
    };
  }

  defaultAction = async (command: Command) => {
    const options = command.optsWithGlobals() as InitCommandOptions;
    const output = this.getOutput(command);
    const configFilePath = path.join(process.cwd(), options.destination);

    output.intro(`Generating Crowdin CLI configuration skeleton '${configFilePath}'`);

    if (await Bun.file(configFilePath).exists()) {
      output.outro(
        `File '${configFilePath}' already exists. ` +
          `Fill it out accordingly to the following requirements: ` +
          `https://developer.crowdin.com/configuration-file/#configuration-file-structure`,
      );
      return;
    }

    let apiToken: string | undefined = options.token ?? undefined;
    let domain: string | undefined = options.baseUrl ? this.extractEnterpriseDomainFromUrl(options.baseUrl) : undefined;

    if (apiToken === undefined) {
      const authorization = await this.authorizeViaBrowser(output);
      apiToken = authorization?.accessToken ?? undefined;
      domain = authorization?.domain ?? undefined;
    }

    if (domain === undefined && (await this.isEnterprise(output))) {
      domain = await this.getEnterpriseDomain(output);
    }

    if (apiToken === undefined) {
      apiToken = await this.getToken(output);
    }

    const apiClient = new Client({ token: apiToken, organization: domain }, { userAgent: buildUserAgent() });
    await this.getAuthorizedUser(apiClient, output);

    const project = await this.selectProject(apiClient, options, output);
    const projectDirectory = await this.selectProjectDirectory(options, output);
    const sourcePattern = await this.selectSourcePattern(options, output);
    const translationPattern = await this.selectTranslationPattern(options, output);
    const apiTokenWritten = await this.writeApiToken(apiToken);

    const config = generate({
      projectId: project.data.id,
      apiToken: apiTokenWritten ? undefined : apiToken,
      basePath: projectDirectory,
      baseUrl: domain ? `https://${domain}.api.crowdin.com` : options.baseUrl,
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

    output.outro(
      'Your configuration skeleton has been successfully generated. ' +
        'Specify your source and translation paths in the files section. ' +
        'For more details see https://crowdin.github.io/crowdin-cli/configuration',
    );
  };

  private async getToken(output: Output) {
    const apiToken = (await text({ message: 'API token:' })) as string;
    this.cancelHandler(apiToken, output);

    return apiToken;
  }

  private async authorizeViaBrowser(output: Output) {
    const confirmation = await confirm({ message: 'Authorize via browser?' });
    this.cancelHandler(confirmation, output);

    if (!confirmation) {
      return null;
    }

    const authorizationUrl =
      `https://accounts.crowdin.com/oauth/authorize?` +
      `client_id=${CROWDIN_OAUTH_CLIENT_ID}&` +
      `redirect_uri=http://${CROWDIN_OAUTH_HOST}:${CROWDIN_OAUTH_PORT}/callback&` +
      `response_type=token&` +
      `scope=project`;

    return new Promise<{ accessToken: string; domain: string | null }>((resolve, reject) => {
      const server = Bun.serve({
        port: CROWDIN_OAUTH_PORT,
        hostname: CROWDIN_OAUTH_HOST,
        fetch(req) {
          const url = new URL(req.url);

          if (url.pathname === '/callback') {
            const params = url.searchParams;
            const accessToken = params.get('access_token');
            const error = params.get('error');

            server.stop();

            if (accessToken) {
              const payload = decodeJwt(accessToken);
              const domain = typeof payload.domain === 'string' ? payload.domain : null;

              resolve({ accessToken, domain });
              return new Response(
                '<h1 style="text-align: center">You have successfully authenticated.</h1>' +
                  '<p style="text-align: center;">You may now close this page.</p>',
                { headers: { 'Content-Type': 'text/html' } },
              );
            }

            reject(new Error(error || 'Unknown error'));
            return new Response(`<h1 style="text-align: center">Error: ${error}</h1>`, {
              headers: { 'Content-Type': 'text/html' },
            });
          }

          return new Response('<h1 style="text-align: center">404 Not Found!</h1>', {
            status: 404,
            headers: { 'Content-Type': 'text/html' },
          });
        },
      });

      openUrl(authorizationUrl);
    });
  }

  private async isEnterprise(output: Output) {
    const confirmation = await confirm({
      message: 'For Crowdin Enterprise?',
      initialValue: false,
    });
    this.cancelHandler(confirmation, output);

    return confirmation as boolean;
  }

  private async getEnterpriseDomain(output: Output) {
    const domain = await text({ message: 'Your organization name:' });
    this.cancelHandler(domain, output);

    return domain as string;
  }

  private extractEnterpriseDomainFromUrl(baseUrl: string) {
    const organization = baseUrl
      .replace(/^https?:?\/?\/?/, '')
      .replace(/(\.?[^.]+)?\.?crowdin\.dev(\/api\/v2)?\/?$/, '')
      .replace(/\.?api\./g, '')
      .replace(/\.?crowdin\.com(\/api\/v2)?\/?$/, '')
      .replace(/.+\.test$/, '')
      .replace(/\.e-test$/, '');

    return organization.length === 0 ? undefined : organization;
  }

  private async getAuthorizedUser(apiClient: Client, output: Output) {
    output.spinner('authorization', 'start', 'Authorizing...');

    try {
      const user = await apiClient.usersApi.getAuthenticatedUser();

      output.spinner('authorization', 'stop', 'Authorized successfully');

      return user;
    } catch (error) {
      output.spinner('authorization', 'error', 'Authorization failed');

      if (error instanceof Error) {
        throw new CliError(`Authorization failed. ${error.message}`, 1, true);
      }

      throw new CliError('Authorization failed', 1, true);
    }
  }

  private async selectProject(apiClient: Client, options: InitCommandOptions, output: Output) {
    let projectId = options.projectId || null;

    if (projectId === null) {
      const projects = await apiClient.projectsGroupsApi.withFetchAll().listProjects({ hasManagerAccess: 1 });
      projectId = (await select({
        message: 'Select project:',
        options: projects.data.map((project) => ({
          label: project.data.name,
          value: project.data.id,
        })),
        maxItems: 10,
      })) as number;

      this.cancelHandler(projectId, output);
    }

    output.spinner('projectValidation', 'start', 'Validating project...');

    try {
      const project = await apiClient.projectsGroupsApi.getProject(Number(projectId));

      output.spinner('projectValidation', 'stop', 'Validation was successful');

      return project;
    } catch (error) {
      if (error instanceof Error) {
        output.spinner('projectValidation', 'error', `Project validation failed. ${error.message}`);
        throw new CliError(`Project validation failed. ${error.message}`, 1, true);
      }

      output.spinner('projectValidation', 'error', 'Project validation failed');
      throw new CliError('Project validation failed', 1, true);
    }
  }

  private async selectProjectDirectory(options: InitCommandOptions, output: Output) {
    if (options.basePath) {
      return options.basePath;
    }

    const projectDirectory = await text({
      message: 'Your project directory:',
      defaultValue: '.',
    });

    this.cancelHandler(projectDirectory, output);

    return projectDirectory as string;
  }

  private async selectSourcePattern(options: InitCommandOptions, output: Output) {
    if (options.source) {
      return options.source;
    }

    const sourcePattern = await text({
      message: 'Source pattern:',
    });

    this.cancelHandler(sourcePattern, output);

    return sourcePattern as string;
  }

  private async selectTranslationPattern(options: InitCommandOptions, output: Output) {
    if (options.translation) {
      return options.translation;
    }

    const translationPattern = await text({
      message: `Translation pattern (supported placeholders: ${patterns.join(', ')}):`,
    });

    this.cancelHandler(translationPattern, output);

    return translationPattern as string;
  }

  protected async writeApiToken(apiToken: string): Promise<boolean> {
    const apiTokenFilePath = getApiTokenFilePathFor(DEFAULT_FILE_NAME);

    try {
      let existing: Record<string, unknown> = {};

      if (await Bun.file(apiTokenFilePath).exists()) {
        existing = YAML.parse(await Bun.file(apiTokenFilePath).text()) ?? {};
      }

      existing.api_token = apiToken;

      await Bun.write(apiTokenFilePath, YAML.stringify(existing));

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
