import path from 'node:path';
import { confirm, isCancel, password, select, text } from '@clack/prompts';
import { Client } from '@crowdin/crowdin-api-client';
import type { Command } from 'commander';
import { decodeJwt } from 'jose';
import { dump as dumpYaml, load as loadYaml } from 'js-yaml';
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
import patterns from '@/lib/export/patterns.ts';
import { DEFAULT_IDENTITY_FILE, getIdentityFilePath } from '@/lib/identityFiles.ts';
import { getOrganization } from '@/lib/organization/credentials.ts';
import { basePath, baseUrl, noPreserveHierarchy, projectId, source, token, translation } from '../common/options.ts';
import { destination, quiet } from './options.ts';

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

      if (!openUrl(authorizationUrl)) {
        output.warning(`Error opening a web browser. Please open the following link manually:\n${authorizationUrl}`);
      }
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

  private async getAuthorizedUser(apiClient: Client, output: Output) {
    output.spinner('authorization', 'start', 'Authorizing...');

    try {
      const user = await apiClient.usersApi.getAuthenticatedUser();

      output.spinner('authorization', 'stop', 'Authorized successfully');

      return user;
    } catch (error) {
      output.spinner('authorization', 'error', 'Authorization failed');
      throw toCliError(error, 'Authorization failed');
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
      output.spinner('projectValidation', 'error', 'Project validation failed');
      throw toCliError(error, 'Project validation failed');
    }
  }

  private async selectProjectDirectory(options: InitCommandOptions, output: Output) {
    if (options.basePath) {
      return options.basePath;
    }

    const projectDirectory = await text({
      message: 'Your project directory:',
      placeholder: '.',
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
      placeholder: '/locales/en/**/*.json',
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
      placeholder: '/resources/%two_letters_code%/%original_file_name%',
    });

    this.cancelHandler(translationPattern, output);

    return translationPattern as string;
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
