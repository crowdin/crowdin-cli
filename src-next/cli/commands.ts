import ConfigCommand from './commands/config/ConfigCommand.ts';
import DownloadCommand from './commands/download/DownloadCommand.ts';
import DistributionCommand from './commands/distribution/DistributionCommand.ts';
import FileCommand from './commands/file/FileCommand.ts';
import InitCommand from './commands/init/InitCommand.ts';
import LanguageCommand from './commands/language/LanguageCommand.ts';
import ProjectCommand from './commands/project/ProjectCommand.ts';
import StatusCommand from './commands/status/StatusCommand.ts';
import TestCommand from './commands/test/TestCommand.ts';
import UploadCommand from './commands/upload/UploadCommand.ts';
import { createGetConfig } from './config.ts';
import { createGetOutput } from './output.ts';
import {
  createGetApiClient,
  createGetProjectService,
  createGetStorageService,
} from './services.ts';
import type { CommandDef } from './types.ts';

const getOutput = createGetOutput();
const getConfig = createGetConfig(getOutput);
const getApiClient = createGetApiClient(getConfig);
const getProjectService = createGetProjectService(getApiClient, getOutput, getConfig);
const getStorageService = createGetStorageService(getApiClient);

const initCommand = new InitCommand(getOutput);
const configCommand = new ConfigCommand(getConfig, getOutput, getProjectService);
const downloadCommand = new DownloadCommand(
  getConfig,
  getOutput,
  getProjectService,
  getApiClient
);
const distributionCommand = new DistributionCommand(getOutput, getProjectService, getApiClient);
const fileCommand = new FileCommand(
  getConfig,
  getOutput,
  getProjectService,
  getStorageService,
  getApiClient
);
const languageCommand = new LanguageCommand(getOutput, getProjectService, getApiClient);
const projectCommand = new ProjectCommand(getOutput, getProjectService, getApiClient);
const statusCommand = new StatusCommand(getOutput, getProjectService);
const testCommand = new TestCommand(getOutput, getApiClient);
const uploadCommand = new UploadCommand(
  getConfig,
  getOutput,
  getProjectService,
  getStorageService,
  getApiClient
);

export const commands: CommandDef[] = [
  uploadCommand.getDefinition(),
  downloadCommand.getDefinition(),
  initCommand.getDefinition(),
  statusCommand.getDefinition(),
  fileCommand.getDefinition(),
  languageCommand.getDefinition(),
  configCommand.getDefinition(),
  projectCommand.getDefinition(),
  distributionCommand.getDefinition(),
  testCommand.getDefinition(),
];
