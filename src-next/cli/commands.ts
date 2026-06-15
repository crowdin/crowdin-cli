import AppCommand from './commands/app/AppCommand.ts';
import AutoTranslateCommand from './commands/auto-translate/AutoTranslateCommand.ts';
import BranchCommand from './commands/branch/BranchCommand.ts';
import BundleCommand from './commands/bundle/BundleCommand.ts';
import CommentCommand from './commands/comment/CommentCommand.ts';
import ConfigCommand from './commands/config/ConfigCommand.ts';
import ContextCommand from './commands/context/ContextCommand.ts';
import DistributionCommand from './commands/distribution/DistributionCommand.ts';
import DownloadCommand from './commands/download/DownloadCommand.ts';
import FileCommand from './commands/file/FileCommand.ts';
import GlossaryCommand from './commands/glossary/GlossaryCommand.ts';
import InitCommand from './commands/init/InitCommand.ts';
import LabelCommand from './commands/label/LabelCommand.ts';
import LanguageCommand from './commands/language/LanguageCommand.ts';
import ProjectCommand from './commands/project/ProjectCommand.ts';
import ScreenshotCommand from './commands/screenshot/ScreenshotCommand.ts';
import StatusCommand from './commands/status/StatusCommand.ts';
import StringCommand from './commands/string/StringCommand.ts';
import TaskCommand from './commands/task/TaskCommand.ts';
import TmCommand from './commands/tm/TmCommand.ts';
import UploadCommand from './commands/upload/UploadCommand.ts';
import { createGetConfig } from './config.ts';
import { createGetOutput } from './output.ts';
import {
  createGetApiClient,
  createGetAppService,
  createGetBranchService,
  createGetBundleService,
  createGetCommentService,
  createGetDirectoryService,
  createGetDistributionService,
  createGetFileService,
  createGetGlossaryService,
  createGetLabelService,
  createGetLanguageService,
  createGetProgressService,
  createGetProjectService,
  createGetScreenshotService,
  createGetStorageService,
  createGetStringService,
  createGetTaskService,
  createGetTmService,
  createGetTranslationService,
} from './services.ts';
import type { CommandDef } from './types.ts';

const getOutput = createGetOutput();
const getConfig = createGetConfig(getOutput);
const getApiClient = createGetApiClient(getConfig);
const getCommentService = createGetCommentService(getApiClient, getConfig);
const getAppService = createGetAppService(getApiClient);
const getBundleService = createGetBundleService(getApiClient, getConfig);
const getDistributionService = createGetDistributionService(getApiClient, getConfig);
const getProjectService = createGetProjectService(getApiClient, getOutput, getConfig);
const getScreenshotService = createGetScreenshotService(getApiClient, getConfig);
const getStorageService = createGetStorageService(getApiClient);
const getStringService = createGetStringService(getApiClient, getConfig);
const getTaskService = createGetTaskService(getApiClient, getConfig);
const getBranchService = createGetBranchService(getApiClient, getConfig);
const getDirectoryService = createGetDirectoryService(getApiClient, getConfig);
const getFileService = createGetFileService(getApiClient, getOutput, getConfig);
const getLabelService = createGetLabelService(getApiClient, getConfig);
const getProgressService = createGetProgressService(getApiClient, getOutput, getConfig);
const getTranslationService = createGetTranslationService(getApiClient, getOutput, getConfig);
const getLanguageService = createGetLanguageService(getApiClient);
const getTmService = createGetTmService(getApiClient, getOutput);
const getGlossaryService = createGetGlossaryService(getApiClient, getOutput);

const commentCommand = new CommentCommand(getOutput, getCommentService);
const appCommand = new AppCommand(getOutput, getAppService);
const bundleCommand = new BundleCommand(getOutput, getBundleService);
const screenshotCommand = new ScreenshotCommand(
  getOutput,
  getScreenshotService,
  getStorageService,
  getBranchService,
  getDirectoryService,
  getFileService,
  getLabelService,
);
const initCommand = new InitCommand(getOutput);
const configCommand = new ConfigCommand(getConfig, getOutput, getProjectService);
const downloadCommand = new DownloadCommand(
  getConfig,
  getOutput,
  getProjectService,
  getBranchService,
  getFileService,
  getTranslationService,
);
const distributionCommand = new DistributionCommand(getOutput, getDistributionService);
const fileCommand = new FileCommand(
  getConfig,
  getOutput,
  getProjectService,
  getStorageService,
  getDirectoryService,
  getFileService,
);
const branchCommand = new BranchCommand(getOutput, getProjectService, getBranchService);
const autoTranslateCommand = new AutoTranslateCommand(
  getOutput,
  getProjectService,
  getBranchService,
  getFileService,
  getLabelService,
  getTranslationService,
);
const labelCommand = new LabelCommand(getOutput, getLabelService);
const languageCommand = new LanguageCommand(getOutput, getProjectService, getLanguageService);
const projectCommand = new ProjectCommand(getOutput, getProjectService);
const statusCommand = new StatusCommand(
  getOutput,
  getProjectService,
  getBranchService,
  getDirectoryService,
  getFileService,
  getProgressService,
);
const stringCommand = new StringCommand(
  getOutput,
  getStringService,
  getBranchService,
  getDirectoryService,
  getFileService,
  getLabelService,
);
const taskCommand = new TaskCommand(getOutput, getTaskService, getApiClient, getBranchService, getFileService);
const tmCommand = new TmCommand(getOutput, getTmService, getStorageService, getApiClient);
const glossaryCommand = new GlossaryCommand(getOutput, getGlossaryService, getStorageService, getApiClient);
const contextCommand = new ContextCommand(
  getOutput,
  getProjectService,
  getStringService,
  getBranchService,
  getFileService,
  getLabelService,
);
const uploadCommand = new UploadCommand(
  getConfig,
  getOutput,
  getProjectService,
  getStorageService,
  getBranchService,
  getDirectoryService,
  getFileService,
  getLabelService,
  getTranslationService,
);

export const commands: CommandDef[] = [
  uploadCommand.getDefinition(),
  downloadCommand.getDefinition(),
  appCommand.getDefinition(),
  bundleCommand.getDefinition(),
  screenshotCommand.getDefinition(),
  initCommand.getDefinition(),
  statusCommand.getDefinition(),
  autoTranslateCommand.getDefinition(),
  stringCommand.getDefinition(),
  taskCommand.getDefinition(),
  fileCommand.getDefinition(),
  branchCommand.getDefinition(),
  languageCommand.getDefinition(),
  labelCommand.getDefinition(),
  commentCommand.getDefinition(),
  configCommand.getDefinition(),
  projectCommand.getDefinition(),
  distributionCommand.getDefinition(),
  contextCommand.getDefinition(),
  tmCommand.getDefinition(),
  glossaryCommand.getDefinition(),
];
