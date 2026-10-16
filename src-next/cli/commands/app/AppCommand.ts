import { readFileSync } from 'node:fs';
import type { Command } from 'commander';
import { baseConfigGroup, dryRun } from '@/cli/commands/common/options.ts';
import CliError from '@/cli/errors/CliError.ts';
import NotFoundError from '@/cli/errors/NotFoundError.ts';
import ValidationError from '@/cli/errors/ValidationError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { AppService } from '@/cli/services/AppService.ts';
import type { GetAppService, GetOutput } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import type { Output } from '@/cli/utils/output.ts';
import { type ApiMethod, findMethodsByPath, joinVerbs } from '@/lib/apps/manifest.ts';
import { describeOperation, type MethodDescription, specUrlFromDocsUrl } from '@/lib/apps/openapi.ts';
import { parseFields } from './fields.ts';
import { field, force, input, method, typedField } from './options.ts';
import { buildApiRequest, parseHttpMethod } from './request.ts';
import {
  appVerboseView,
  appView,
  createMethodDescriptionView,
  dryRunView,
  methodVerboseView,
  methodView,
  rawJsonView,
} from './views.ts';

interface UninstallOptions extends GlobalOptions {
  force?: boolean;
}

interface MethodsOptions extends GlobalOptions {
  method?: string;
}

interface ApiOptions extends GlobalOptions {
  method?: string;
  field?: string[];
  typedField?: string[];
  input?: string;
  dryrun?: boolean;
}

const identifierArgument = {
  name: 'identifier',
  description: "Application identifier, as printed by 'crowdin app list'",
};

export default class AppCommand {
  constructor(
    private getOutput: GetOutput,
    private getAppService: GetAppService,
  ) {}

  getDefinition(): CommandDef {
    return {
      name: 'app',
      description: 'Manage apps',
      subcommands: [
        {
          name: 'list',
          description: 'List installed apps',
          options: [baseConfigGroup],
          action: this.listAction,
        },
        {
          name: 'install',
          description: 'Install the application',
          arguments: [{ name: 'identifier', description: 'Application identifier. You can find it on Crowdin Store' }],
          options: [baseConfigGroup],
          action: this.installAction,
        },
        {
          name: 'uninstall',
          description: 'Uninstall the application',
          arguments: [identifierArgument],
          options: [force, baseConfigGroup],
          action: this.uninstallAction,
        },
        {
          name: 'methods',
          description: "List the application's API methods, or describe one",
          arguments: [identifierArgument, { name: 'path', description: 'API method path to describe', optional: true }],
          options: [
            { ...method, description: 'Pick one of several HTTP methods declared for the same path' },
            baseConfigGroup,
          ],
          action: this.methodsAction,
        },
        {
          name: 'api',
          description: "Call one of the application's API methods",
          arguments: [
            identifierArgument,
            { name: 'path', description: 'API method path, optionally with a query string' },
          ],
          options: [method, field, typedField, input, dryRun, baseConfigGroup],
          action: this.apiAction,
        },
      ],
      action: this.defaultAction,
    };
  }

  defaultAction = async (command: Command) => {
    command.help();
  };

  listAction = async (command: Command) => {
    const output = this.getOutput(command);
    const appService = await this.getAppService(command);
    const apps = await appService.list();
    const options = command.optsWithGlobals() as GlobalOptions;

    output.list(apps, options.verbose ? appVerboseView : appView, { empty: 'No applications found' });
  };

  installAction = async (command: Command) => {
    const [identifier] = command.args;

    this.validateAppIdentifier(identifier);

    const output = this.getOutput(command);
    const appService = await this.getAppService(command);
    const manifestUrl = await appService.findManifestUrl(identifier);

    if (!manifestUrl) {
      throw new CliError(`Application with identifier '${identifier}' doesn't exist in Crowdin Store`);
    }

    const app = await appService.installByManifestUrl(manifestUrl);

    output.success('Application has been installed');
    // The sentence above is text-only, and it names nothing; the installed app is what a machine
    // format owes the caller — the same view `app list` renders.
    output.item(app, appView, { mark: false });
  };

  uninstallAction = async (command: Command) => {
    const [identifier] = command.args;

    this.validateAppIdentifier(identifier);

    const options = command.optsWithGlobals() as UninstallOptions;
    const output = this.getOutput(command);
    const appService = await this.getAppService(command);

    await appService.uninstall(identifier, options.force ?? false);

    output.success('Application has been uninstalled');
  };

  methodsAction = async (command: Command) => {
    const [app, path] = command.args;

    this.validateAppIdentifier(app);

    const options = command.optsWithGlobals() as MethodsOptions;
    const output = this.getOutput(command);
    const appService = await this.getAppService(command);
    const methods = await appService.listMethods(app);

    if (path === undefined) {
      // biome-ignore format: one argument per line
      output.list(
        methods,
        options.verbose ? methodVerboseView : methodView,
        { empty: `Application '${app}' declares no API methods` },
      );
      return;
    }

    const selected = this.selectMethod(app, methods, path, options.method);
    const described = await this.describeMethod(appService, output, selected);

    output.item(described, createMethodDescriptionView(app), { mark: false });
  };

  apiAction = async (command: Command) => {
    const [app, path = ''] = command.args;

    this.validateAppIdentifier(app);

    const options = command.optsWithGlobals() as ApiOptions;
    const output = this.getOutput(command);
    const source = options.input;
    const request = buildApiRequest({
      path,
      method: options.method,
      fields: parseFields(options.field ?? [], options.typedField ?? []),
      readInput: source === undefined ? undefined : () => this.readJsonInput(source),
    });
    const appService = await this.getAppService(command);
    const url = appService.requestUrl(app, request);

    if (options.dryrun) {
      output.item({ method: request.method, url, body: request.body ?? null }, dryRunView, { mark: false });
      return;
    }

    output.debug(`${request.method} ${url}`);

    const result = await appService.callApi(app, request);

    if (result === undefined) {
      output.success('Request completed with no content');
      return;
    }

    output.item(result, rawJsonView, { mark: false });
  };

  private selectMethod(app: string, methods: ApiMethod[], path: string, verb: string | undefined): ApiMethod {
    const matches = findMethodsByPath(methods, path);
    const declared = joinVerbs(matches.map((match) => match.method));
    const [first] = matches;

    if (!first) {
      throw new NotFoundError(
        `Application '${app}' declares no API method at '${path}'. Run 'crowdin app methods ${app}' to list them`,
      );
    }

    if (verb === undefined) {
      if (matches.length > 1) {
        throw new ValidationError(`'${path}' is declared for ${declared}. Pass --method to choose one`);
      }

      return first;
    }

    const wanted = parseHttpMethod(verb);
    const match = matches.find((candidate) => candidate.method === wanted);

    if (!match) {
      throw new NotFoundError(`Application '${app}' declares '${path}' for ${declared}, not ${wanted}`);
    }

    return match;
  }

  // The OpenAPI document is a framework convention, not a platform contract: any failure falls back
  // to what the manifest says.
  private async describeMethod(appService: AppService, output: Output, method: ApiMethod): Promise<MethodDescription> {
    const fallback = { ...method, specUrl: null, operationId: null, parameters: null, requestBody: null };
    const { documentationUrl } = method;
    const specUrl = documentationUrl ? specUrlFromDocsUrl(documentationUrl) : null;

    if (!documentationUrl || !specUrl) {
      return fallback;
    }

    try {
      const operation = describeOperation(await appService.fetchOpenApi(specUrl), { ...method, documentationUrl });

      if (operation) {
        return { ...method, specUrl, ...operation };
      }

      output.debug(`No OpenAPI description: ${specUrl} describes no ${method.method} ${method.path}`);
    } catch (error) {
      output.debug(`No OpenAPI description: ${CliError.getErrorMessage(error)}`);
    }

    return fallback;
  }

  private readJsonInput(source: string): unknown {
    try {
      return JSON.parse(readFileSync(source === '-' ? 0 : source, 'utf8'));
    } catch (error) {
      throw new ValidationError(`Invalid --input '${source}': ${CliError.getErrorMessage(error)}`);
    }
  }

  // The identifier lands in a URL path, so it must stay one segment.
  private validateAppIdentifier(identifier: string | undefined): asserts identifier is string {
    if (!identifier) {
      throw new CliError('Application identifier can not be empty');
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(identifier)) {
      throw new ValidationError(
        `Invalid application identifier '${identifier}'. Use letters, digits, underscores and dashes`,
      );
    }
  }
}
