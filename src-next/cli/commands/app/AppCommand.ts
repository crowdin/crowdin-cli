import { readFileSync } from 'node:fs';
import type { Command } from 'commander';
import { baseConfigGroup, dryRun } from '@/cli/commands/common/options.ts';
import CliError from '@/cli/errors/CliError.ts';
import NotFoundError from '@/cli/errors/NotFoundError.ts';
import ValidationError from '@/cli/errors/ValidationError.ts';
import type { GlobalOptions } from '@/cli/options.ts';
import type { ApiRequest, AppService } from '@/cli/services/AppService.ts';
import type { GetAppService, GetOutput } from '@/cli/services.ts';
import type { CommandDef } from '@/cli/types.ts';
import type { Output } from '@/cli/utils/output.ts';
import { withSpinner } from '@/cli/utils/withSpinner.ts';
import { type ApiMethod, findMethodsByPath, joinVerbs } from '@/lib/apps/manifest.ts';
import { describeOperation, type MethodDescription, specUrlFromDocsUrl } from '@/lib/apps/openapi.ts';
import { isRecord } from '@/lib/utils/record.ts';
import { parseFields } from './fields.ts';
import { field, force, input, method, typedField, wait } from './options.ts';
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
  wait?: boolean;
}

interface Job {
  app: string;
  projectId: string;
  jobId: string;
}

const JOB_POLL_INTERVAL = 3000;
const JOB_IDLE_HOURS = 1;
const TERMINAL_JOB_STATUSES = ['finished', 'failed', 'canceled'];

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
          options: [method, field, typedField, input, wait, dryRun, baseConfigGroup],
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

    const target = options.wait ? this.jobTarget(request) : undefined;

    if (target && target.jobId === undefined) {
      await this.ensureJobInfo(appService, app);
    }

    output.debug(`${request.method} ${url}`);

    const result = await appService.callApi(app, request);

    if (!target) {
      this.printResult(output, result);
      return;
    }

    const jobId = target.jobId ?? this.responseJobId(result);

    if (jobId === undefined) {
      this.printResult(output, result);
      output.warning('Response has no jobId; nothing to wait for');
      return;
    }

    const job = { app, projectId: target.projectId, jobId };
    // In resume mode the user's own job-info call already returned the record.
    const record = await this.waitForJob(output, appService, job, target.jobId === undefined ? undefined : result);

    this.printResult(output, record);

    const failure = this.jobFailure(job, record);

    if (failure) {
      throw new CliError(failure);
    }
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

  private printResult(output: Output, result: unknown) {
    if (result === undefined) {
      output.success('Request completed with no content');
      return;
    }

    output.item(result, rawJsonView, { mark: false });
  }

  // Validated before sending, so a request that would start a job never starts one we can't wait on.
  private jobTarget(request: ApiRequest): { projectId: string; jobId?: string } {
    const query = new URLSearchParams(request.query);
    const body = isRecord(request.body) ? request.body : {};
    const read = (key: string) => query.get(key) ?? this.scalar(body[key]);
    const projectId = read('projectId');

    if (!projectId || !/^[1-9]\d*$/.test(projectId)) {
      throw new ValidationError('--wait needs a positive integer projectId in the request body or query');
    }

    if (request.method !== 'GET' || request.path !== 'job-info') {
      return { projectId };
    }

    const jobId = read('jobId');

    if (!jobId) {
      throw new ValidationError('--wait on job-info needs a jobId');
    }

    return { projectId, jobId };
  }

  private async ensureJobInfo(appService: AppService, app: string) {
    const methods = findMethodsByPath(await appService.listMethods(app), 'job-info');

    if (!methods.some((declared) => declared.method === 'GET')) {
      throw new CliError(`Application '${app}' declares no GET job-info; --wait needs it`);
    }
  }

  private responseJobId(result: unknown): string | undefined {
    return isRecord(result) ? this.scalar(result.jobId) || undefined : undefined;
  }

  private scalar(value: unknown): string | undefined {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
  }

  private async waitForJob(output: Output, appService: AppService, job: Job, first: unknown): Promise<unknown> {
    const request: ApiRequest = {
      method: 'GET',
      path: 'job-info',
      query: new URLSearchParams({ projectId: job.projectId, jobId: job.jobId }).toString(),
      body: undefined,
    };
    const poll = async () => {
      try {
        return await appService.callApi(job.app, request);
      } catch (error) {
        throw new CliError(
          `${CliError.getErrorMessage(error)}. The job may still be running. ${this.resumeHint(job)}`,
          CliError.getExitCode(error),
        );
      }
    };

    return await withSpinner(
      output,
      'appJob',
      {
        start: `Waiting for job ${job.jobId}`,
        stop: (record) => `Job ${job.jobId} ${this.jobStatus(record) ?? 'returned no status'}`,
        fail: `Failed to wait for job ${job.jobId}`,
      },
      async () => {
        const report = (record: unknown) => {
          if (this.isRunning(record)) {
            output.spinner('appJob', 'message', `Job ${job.jobId}: ${this.jobState(record)}`);
          }
        };
        let record = first === undefined ? await poll() : first;
        let state = this.jobState(record);
        let changedAt = Date.now();

        report(record);

        // Idle, not total: a long job that keeps progressing is worth waiting for.
        while (this.isRunning(record) && Date.now() - changedAt < JOB_IDLE_HOURS * 3_600_000) {
          await Bun.sleep(JOB_POLL_INTERVAL);
          record = await poll();

          if (this.jobState(record) !== state) {
            state = this.jobState(record);
            changedAt = Date.now();
            report(record);
          }
        }

        return record;
      },
    );
  }

  private jobFailure(job: Job, record: unknown): string | undefined {
    const status = this.jobStatus(record);
    const info = isRecord(record) && typeof record.info === 'string' && record.info ? `: ${record.info}` : '';

    if (status === undefined) {
      return `job-info returned no job status for job '${job.jobId}'`;
    }

    switch (status.toLowerCase()) {
      case 'finished':
        return undefined;
      case 'failed':
        return `Job '${job.jobId}' failed${info}`;
      case 'canceled':
        return `Job '${job.jobId}' was canceled${info}`;
      default:
        return `Job '${job.jobId}' has not progressed for ${JOB_IDLE_HOURS} h (still ${this.jobState(record)}). ${this.resumeHint(job)}`;
    }
  }

  private isRunning(record: unknown): boolean {
    const status = this.jobStatus(record);
    return status !== undefined && !TERMINAL_JOB_STATUSES.includes(status.toLowerCase());
  }

  private jobStatus(record: unknown): string | undefined {
    return isRecord(record) && typeof record.status === 'string' ? record.status : undefined;
  }

  private jobState(record: unknown): string {
    const progress = isRecord(record) && typeof record.progress === 'number' ? `, ${record.progress}%` : '';
    return `${this.jobStatus(record)}${progress}`;
  }

  // The jobId can come from the app's response, and the hint is meant to be pasted into a shell.
  private resumeHint({ app, projectId, jobId }: Job): string {
    const quoted = `'jobId=${jobId.replaceAll("'", `'\\''`)}'`;
    return `Resume with: crowdin app api ${app} job-info -F projectId=${projectId} -f ${quoted} --wait`;
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
