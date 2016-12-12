package com.crowdin.cli.commands;

import com.crowdin.cli.utils.MessageSource;
import com.crowdin.cli.utils.Utils;

import java.io.IOException;
import java.util.ResourceBundle;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.apache.commons.cli.HelpFormatter;
import org.apache.commons.cli.Options;

/**
 * @author ihor
 */
public class CrowdinCliOptions {

    private static final ResourceBundle RESOURCE_BUNDLE = MessageSource.RESOURCE_BUNDLE;

    public static final String ACCOUNT_KEY_DESCRIPTION = RESOURCE_BUNDLE.getString("account_key_description");

    public static final String ACCOUNT_KEY_LONG = "account";

    public static final String ACCOUNT_KEY_SHORT = "a";

    public static final String APPLICATION_NAME = "crowdin";

    public static final String AUTO_UPDATE = "auto-update";

    public static final String NO_AUTO_UPDATE = "no-auto-update";

    public static final String NO_OR_AUTO_UPDATE = "[no-]auto-update";

    public static final String NO_OR_AUTO_UPDATE_DESCRIPTION = RESOURCE_BUNDLE.getString("no_or_auto_update_description");

    public static final String AUTO_APPROVE_IMPORTED = "auto-approve-imported";

    public static final String NO_AUTO_APPROVE_IMPORTED = "no-auto-approve-imported";

    public static final String NO_OR_AUTO_APPROVE_IMPORTED = "[no-]auto-approve-imported";

    public static final String NO_OR_AUTO_APPROVE_IMPORTED_DESCRIPTIONS = RESOURCE_BUNDLE.getString("no_or_auto_approve_imported_description");

    public static final String BASE_PATH_DESCRIPTION = RESOURCE_BUNDLE.getString("base_path_description");

    public static final String BASE_PATH_LONG = "base-path";

    public static final String BRANCH_DESCRIPTION = RESOURCE_BUNDLE.getString("branch_description");

    public static final String BRANCH_LONG = "branch";

    public static final String BRANCH_SHORT = "b";

    public static final String CONFIG_DESCRIPTION = RESOURCE_BUNDLE.getString("config_description");

    public static final String CONFIG_LONG = "config";

    public static final String HELP_C = "c";

    public static final String HELP_C_DESCRIPTIONS = "List commands one per line, to assist with shell completion";

    public static final String DRY_RUN_DESCRIPTION = RESOURCE_BUNDLE.getString("dryrun_description");

    public static final String DRY_RUN_LONG = "dryrun";

    public static final String DEBUG_LONG = "debug";

    public static final String DESTINATION_DESCRIPTION = "where save generated file";

    public static final String DESTINATION_LONG = "destination";

    public static final String DESTINATION_SHORT = "d";

    public static final String FILE_DESCRIPTION = RESOURCE_BUNDLE.getString("file_description");

    public static final String FILE_LONG = "file";

    public static final String FILE_SHORT = "f";

    public static final String HELP_DESCRIPTION = RESOURCE_BUNDLE.getString("help_description");

    public static final String HELP_LONG = "help";

    public static final String HELP_SHORT = "h";

    public static final String IGNORE_MATCH_DESCRIPTIONS = RESOURCE_BUNDLE.getString("ignore_match_description");

    public static final String IGNORE_MATCH_LONG = "ignore-match";

    public static final String IMPORT_DUPLICATES = "import-duplicates";

    public static final String NO_IMPORT_DUPLICATES = "no-import-duplicates";

    public static final String NO_OR_IMPORT_DUPLICATES = "[no-]import-duplicates";

    public static final String NO_OR_IMPORT_DUPLICATES_DESCRIPTION = RESOURCE_BUNDLE.getString("no_or_import_duplicates_description");

    public static final String IMPORT_EQ_SUGGESTIONS = "import-eq-suggestions";

    public static final String NO_IMPORT_EQ_SUGGESTIONS = "no-import-eq-suggestions";

    public static final String NO_OR_IMPORT_EQ_SUGGESTIONS = "[no-]import-eq-suggestions";

    public static final String NO_OR_IMPORT_EQ_SUGGESTIONS_DESCRIPTION = RESOURCE_BUNDLE.getString("no_or_import_eq_suggestions_description");

    public static final String LANGUAGE_DESCRIPTION = RESOURCE_BUNDLE.getString("language_description");

    public static final String LANGUAGE_DOWNLOAD_DESCRIPTION = RESOURCE_BUNDLE.getString("language_download_description");

    public static final String LANGUAGE_LONG = "language";

    public static final String LANGUAGE_SHORT = "l";

    public static final String PROJECT_IDENTIFIER_DESCRIPTION = RESOURCE_BUNDLE.getString("project_identifier_description");

    public static final String PROJECT_IDENTIFIER_LONG = "identifier";

    public static final String PROJECT_IDENTIFIER_SHORT = "i";

    public static final String PROJECT_KEY_DESCRIPTION = RESOURCE_BUNDLE.getString("project_key_description");

    public static final String PROJECT_KEY_LONG = "key";

    public static final String PROJECT_KEY_SHORT = "k";

    public static final String SOURCE_DESCRIPTION = RESOURCE_BUNDLE.getString("source_description");

    public static final String SOURCE_LONG = "source";

    public static final String SOURCE_SHORT = "s";

    public static final String TRANSLATION_DESCRIPTION = RESOURCE_BUNDLE.getString("translation_description");

    public static final String TRANSLATION_LONG = "translation";

    public static final String TRANSLATION_SHORT = "t";

    public static final String TREE_DESCRIPTIONS = RESOURCE_BUNDLE.getString("tree_description");

    public static final String TREE_LONG = "tree";

    public static final String VERBOSE_DESCRIPTION = RESOURCE_BUNDLE.getString("verbose_description");

    public static final String VERBOSE_LONG = "verbose";

    public static final String VERBOSE_SHORT = "v";

    public static final String VERSION_DESCRIPTION = RESOURCE_BUNDLE.getString("version_description");

    public static final String VERSION_LONG = "version";

    public static final String NEW_LINE = "\n";

    public static final String DOUBLE_NEW_LINE = NEW_LINE + NEW_LINE;

    public static final int STRING_WIDTH = 140;

    public Options init() {
        Options options = new Options();
        options.addOption(ACCOUNT_KEY_SHORT, ACCOUNT_KEY_LONG, true, ACCOUNT_KEY_DESCRIPTION);
        options.addOption(null, AUTO_APPROVE_IMPORTED, false, null);
        options.addOption(null, NO_AUTO_APPROVE_IMPORTED, false, null);
        options.addOption(null, AUTO_UPDATE, false, null);
        options.addOption(null, NO_AUTO_UPDATE, false, null);
        options.addOption(BRANCH_SHORT, BRANCH_LONG, true, null);
        options.addOption(HELP_C, null, false, HELP_C_DESCRIPTIONS);
        options.addOption(null, CONFIG_LONG, true, CONFIG_DESCRIPTION);
        options.addOption(null, DRY_RUN_LONG, false, DRY_RUN_DESCRIPTION);
        options.addOption(null, DEBUG_LONG, false, null);
        options.addOption(DESTINATION_SHORT, DESTINATION_LONG, true, DESTINATION_DESCRIPTION);
        options.addOption(FILE_SHORT, FILE_LONG, true, FILE_DESCRIPTION);
        options.addOption(HELP_SHORT, HELP_LONG, false, HELP_DESCRIPTION);
        options.addOption(null, IGNORE_MATCH_LONG, false, IGNORE_MATCH_DESCRIPTIONS);
        options.addOption(null, IMPORT_DUPLICATES, false, null);
        options.addOption(null, NO_IMPORT_DUPLICATES, false, null);
        options.addOption(null, IMPORT_EQ_SUGGESTIONS, false, null);
        options.addOption(null, NO_IMPORT_EQ_SUGGESTIONS, false, null);
        options.addOption(LANGUAGE_SHORT, LANGUAGE_LONG, true, null);
        options.addOption(VERBOSE_SHORT, VERBOSE_LONG, false, VERBOSE_DESCRIPTION);
        options.addOption(PROJECT_IDENTIFIER_SHORT, PROJECT_IDENTIFIER_LONG, true, PROJECT_IDENTIFIER_DESCRIPTION);
        options.addOption(null, TREE_LONG, false, null);
        options.addOption(PROJECT_KEY_SHORT, PROJECT_KEY_LONG, true, PROJECT_KEY_DESCRIPTION);
        options.addOption(null, VERSION_LONG, false, VERSION_DESCRIPTION);
        options.addOption(null, BASE_PATH_LONG, true, BASE_PATH_DESCRIPTION);
        options.addOption(SOURCE_SHORT, SOURCE_LONG, true, SOURCE_DESCRIPTION);
        options.addOption(TRANSLATION_SHORT, TRANSLATION_LONG, true, TRANSLATION_DESCRIPTION);
        return options;
    }

    public void cmdGeneralOptions() {
        Options options = this.globalOptions();
        HelpFormatter formatter = new HelpFormatter();
        formatter.setWidth(STRING_WIDTH);
        StringBuilder header = new StringBuilder();
        StringBuilder footer = new StringBuilder();
        String cmdLineSyntax = APPLICATION_NAME;
        header.append(NEW_LINE).append(RESOURCE_BUNDLE.getString("name").toUpperCase());
        header.append(NEW_LINE).append(RESOURCE_BUNDLE.getString("crowdin_cli_description"));
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("synopsis").toUpperCase());
        header.append(NEW_LINE).append("crowdin [global options] command [command options] [arguments...]");
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("version").toUpperCase());
        header.append(NEW_LINE).append(Utils.getAppVersion());
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("global_options").toUpperCase());
        footer.append(NEW_LINE).append(RESOURCE_BUNDLE.getString("commands").toUpperCase());
        footer.append(NEW_LINE + "help        - ").append(RESOURCE_BUNDLE.getString("command_help_description"));
        footer.append(NEW_LINE + "upload      - ").append(RESOURCE_BUNDLE.getString("command_upload_description"));
        footer.append(NEW_LINE + "download    - ").append(RESOURCE_BUNDLE.getString("command_download_description"));
        footer.append(NEW_LINE + "list        - ").append(RESOURCE_BUNDLE.getString("command_list"));
        footer.append(NEW_LINE + "lint        - ").append(RESOURCE_BUNDLE.getString("command_lint_description"));
        footer.append(NEW_LINE + "generate    - ").append(RESOURCE_BUNDLE.getString("command_generate_description"));
        formatter.printHelp(cmdLineSyntax, header.toString(), options, footer.toString(), false);
    }

    public void cmdUploadOptions() {
        Options options = new Options();
        HelpFormatter formatter = new HelpFormatter();
        formatter.setWidth(STRING_WIDTH);
        StringBuilder header = new StringBuilder();
        StringBuilder footer = new StringBuilder();
        String cmdLineSyntax = "upload";
        header.append(NEW_LINE).append(RESOURCE_BUNDLE.getString("name").toUpperCase());
        header.append(NEW_LINE + "upload - ").append(RESOURCE_BUNDLE.getString("command_upload_description"));
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("synopsis").toUpperCase());
        header.append(NEW_LINE + "<script> [global options] upload sources [--auto-update] [-b branch_name|--branch branch_name] [--dryrun]");
        header.append(NEW_LINE + "<script> [global options] upload translations [--auto-approve-imported] [--import-duplicates] [--import-eq-suggestions] [-b branch_name|--branch branch_name] [-l crowdin_language_code|--language crowdin_language_code]");
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("description").toUpperCase());
        header.append(NEW_LINE).append(RESOURCE_BUNDLE.getString("command_upload_description_long"));
        footer.append(NEW_LINE).append(RESOURCE_BUNDLE.getString("commands").toUpperCase());
        footer.append(NEW_LINE + "sources    -     ").append(RESOURCE_BUNDLE.getString("subcommand_sources"));
        footer.append(NEW_LINE + "transaltions -   ").append(RESOURCE_BUNDLE.getString("subcommand_translations"));
        footer.append(NEW_LINE);
        formatter.printHelp(cmdLineSyntax, header.toString(), options, footer.toString(), false);
    }

    public void cmdUploadSourcesOptions() {
        Options options = this.cmdUploadSources();
        HelpFormatter formatter = new HelpFormatter();
        formatter.setWidth(STRING_WIDTH);
        StringBuilder header = new StringBuilder();
        StringBuilder footer = new StringBuilder();
        String cmdLineSyntax = "upload sources";
        header.append(NEW_LINE).append(RESOURCE_BUNDLE.getString("name").toUpperCase());
        header.append(NEW_LINE + "source - ").append(RESOURCE_BUNDLE.getString("subcommand_sources"));
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("synopsis").toUpperCase());
        header.append(NEW_LINE + "<script> [global options] upload sources [command options]");
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("description").toUpperCase());
        header.append(NEW_LINE).append(RESOURCE_BUNDLE.getString("subcommand_sources_long"));
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("command_options").toUpperCase());
        formatter.printHelp(cmdLineSyntax, header.toString(), options, footer.toString(), false);
    }

    public void cmdHelpOptions() {
        Options options = this.cmdHelp();
        HelpFormatter formatter = new HelpFormatter();
        formatter.setWidth(STRING_WIDTH);
        StringBuilder header = new StringBuilder();
        StringBuilder footer = new StringBuilder();
        String cmdLineSyntax = "help";
        header.append(NEW_LINE).append(RESOURCE_BUNDLE.getString("name").toUpperCase());
        header.append(NEW_LINE + "help - ").append(RESOURCE_BUNDLE.getString("command_help_short_desc"));
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("synopsis").toUpperCase());
        header.append(NEW_LINE + "<script> [global options] help [command options]");
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("description").toUpperCase());
        header.append(NEW_LINE).append(RESOURCE_BUNDLE.getString("command_help_long_desc"));
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("command_options").toUpperCase());
        formatter.printHelp(cmdLineSyntax, header.toString(), options, footer.toString(), false);
    }

    public void cmdUploadTranslationsOptions() {
        Options options = this.cmdUploadTranslations();
        HelpFormatter formatter = new HelpFormatter();
        formatter.setWidth(STRING_WIDTH);
        StringBuilder header = new StringBuilder();
        StringBuilder footer = new StringBuilder();
        String cmdLineSyntax = "upload translation";
        header.append(NEW_LINE).append(RESOURCE_BUNDLE.getString("name").toUpperCase());
        header.append(NEW_LINE + "translation - ").append(RESOURCE_BUNDLE.getString("subcommand_translations"));
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("synopsis").toUpperCase());
        header.append(NEW_LINE + "<script> [global options] upload translations [command options]");
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("description").toUpperCase());
        header.append(NEW_LINE).append(RESOURCE_BUNDLE.getString("subcommand_translations_long"));
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("command_options").toUpperCase());
        formatter.printHelp(cmdLineSyntax, header.toString(), options, footer.toString(), false);
    }

    public void cmdDownloadOptions() {
        Options options = this.cmdDownload();
        HelpFormatter formatter = new HelpFormatter();
        formatter.setWidth(STRING_WIDTH);
        StringBuilder header = new StringBuilder();
        StringBuilder footer = new StringBuilder();
        String cmdLineSyntax = "download";
        header.append(NEW_LINE).append(RESOURCE_BUNDLE.getString("name").toUpperCase());
        header.append(NEW_LINE + "download - ").append(RESOURCE_BUNDLE.getString("command_download_description"));
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("synopsis").toUpperCase());
        header.append(NEW_LINE + "<script> [global options] download [--dryrun]");
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("command_options").toUpperCase());
        formatter.printHelp(cmdLineSyntax, header.toString(), options, footer.toString(), false);
    }

    public void cmdListOptions() {
        Options options = new Options();
        HelpFormatter formatter = new HelpFormatter();
        formatter.setWidth(STRING_WIDTH);
        StringBuilder header = new StringBuilder();
        StringBuilder footer = new StringBuilder();
        String cmdLineSyntax = "list";
        header.append(NEW_LINE).append(RESOURCE_BUNDLE.getString("name").toUpperCase());
        header.append(NEW_LINE + "list - ").append(RESOURCE_BUNDLE.getString("command_list"));
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("synopsis").toUpperCase());
        header.append(NEW_LINE + "<script> [global options] list project [--tree] [-b branch_name|--branch branch_name]");
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("description").toUpperCase());
        header.append(NEW_LINE).append(RESOURCE_BUNDLE.getString("command_list_long"));
        footer.append(NEW_LINE).append(RESOURCE_BUNDLE.getString("commands").toUpperCase());
        footer.append(DOUBLE_NEW_LINE + "project      - ").append(RESOURCE_BUNDLE.getString("subcommand_list_project"));
        footer.append(NEW_LINE);
        formatter.printHelp(cmdLineSyntax, header.toString(), options, footer.toString(), false);
    }

    public void cmdLintOptions() {
        Options options = this.cmdLint();
        HelpFormatter formatter = new HelpFormatter();
        formatter.setWidth(STRING_WIDTH);
        StringBuilder header = new StringBuilder();
        StringBuilder footer = new StringBuilder();
        String cmdLineSyntax = "lint";
        header.append(NEW_LINE).append(RESOURCE_BUNDLE.getString("name").toUpperCase());
        header.append(NEW_LINE + "lint - ").append(RESOURCE_BUNDLE.getString("command_lint_description"));
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("synopsis").toUpperCase());
        header.append(NEW_LINE + "<script> [global options] lint [command options]");
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("description").toUpperCase());
        header.append(NEW_LINE).append(RESOURCE_BUNDLE.getString("command_lint_description_long"));
        formatter.printHelp(cmdLineSyntax, header.toString(), options, footer.toString(), false);
    }

    public void cmdGenerateOptions() {
        Options options = this.cmdGenerate();
        HelpFormatter formatter = new HelpFormatter();
        formatter.setWidth(STRING_WIDTH);
        StringBuilder header = new StringBuilder();
        StringBuilder footer = new StringBuilder();
        String cmdLineSyntax = "generate";
        header.append(NEW_LINE).append(RESOURCE_BUNDLE.getString("name").toUpperCase());
        header.append(NEW_LINE + "generate - ").append(RESOURCE_BUNDLE.getString("command_generate_description"));
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("synopsis").toUpperCase());
        header.append(NEW_LINE + "<script> [global options] generate [command options]");
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("description").toUpperCase());
        header.append(NEW_LINE).append(RESOURCE_BUNDLE.getString("command_generate_description"));
        formatter.printHelp(cmdLineSyntax, header.toString(), options, footer.toString(), false);
    }

    public void cmdListProjectOptions() {
        Options options = this.cmdListProject();
        HelpFormatter formatter = new HelpFormatter();
        formatter.setWidth(STRING_WIDTH);
        StringBuilder header = new StringBuilder();
        StringBuilder footer = new StringBuilder();
        String cmdLineSyntax = "list project";
        header.append(NEW_LINE).append(RESOURCE_BUNDLE.getString("name").toUpperCase());
        header.append(NEW_LINE + "project - ").append(RESOURCE_BUNDLE.getString("subcommand_list_project"));
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("synopsis").toUpperCase());
        header.append(NEW_LINE + "<script> [global options] list project [command options]");
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("command_options").toUpperCase());
        formatter.printHelp(cmdLineSyntax, header.toString(), options, footer.toString(), false);
    }

    public void cmdListSourcesOptions() {
        Options options = this.cmdListSources();
        HelpFormatter formatter = new HelpFormatter();
        formatter.setWidth(STRING_WIDTH);
        StringBuilder header = new StringBuilder();
        StringBuilder footer = new StringBuilder();
        String cmdLineSyntax = "list sources";
        header.append(NEW_LINE).append(RESOURCE_BUNDLE.getString("name").toUpperCase());
        header.append(NEW_LINE + "sources - ").append(RESOURCE_BUNDLE.getString("subcommand_list_sources"));
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("synopsis").toUpperCase());
        header.append(NEW_LINE + "<script> [global options] list sources [command options]");
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("command_options").toUpperCase());
        formatter.printHelp(cmdLineSyntax, header.toString(), options, footer.toString(), false);
    }

    public void cmdListTranslationsIOptions() {
        Options options = this.cmdListTranslations();
        HelpFormatter formatter = new HelpFormatter();
        formatter.setWidth(STRING_WIDTH);
        StringBuilder header = new StringBuilder();
        StringBuilder footer = new StringBuilder();
        String cmdLineSyntax = "list translations";
        header.append(NEW_LINE).append(RESOURCE_BUNDLE.getString("name").toUpperCase());
        header.append(NEW_LINE + "translations - ").append(RESOURCE_BUNDLE.getString("subcommand_list_translations"));
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("synopsis").toUpperCase());
        header.append(NEW_LINE + "<script> [global options] list translations [command options]");
        header.append(DOUBLE_NEW_LINE).append(RESOURCE_BUNDLE.getString("command_options").toUpperCase());
        formatter.printHelp(cmdLineSyntax, header.toString(), options, footer.toString(), false);
    }

    private Options globalOptions() {
        Options o = new Options();
        o.addOption(null, HELP_LONG, false, HELP_DESCRIPTION);
        o.addOption(null, CONFIG_LONG, true, CONFIG_DESCRIPTION);
        o.addOption(VERBOSE_SHORT, VERBOSE_LONG, false, VERBOSE_DESCRIPTION);
        o.addOption(null, VERSION_LONG, false, VERSION_DESCRIPTION);
        return o;
    }

    private Options cmdUploadSources() {
        Options options = new Options();
        options.addOption(null, NO_OR_AUTO_UPDATE, false, NO_OR_AUTO_UPDATE_DESCRIPTION);
        options.addOption(BRANCH_SHORT, BRANCH_LONG, true, BRANCH_DESCRIPTION);
        options.addOption(null, DRY_RUN_LONG, false, DRY_RUN_DESCRIPTION);
        options.addOption(null, TREE_LONG, false, TREE_DESCRIPTIONS);
        return options;
    }

    private Options cmdHelp() {
        Options options = new Options();
        options.addOption(HELP_C, null, false, HELP_C_DESCRIPTIONS);
        return options;
    }

    private Options cmdUploadTranslations() {
        Options options = new Options();
        options.addOption(BRANCH_SHORT, BRANCH_LONG, true, BRANCH_DESCRIPTION);
        options.addOption(LANGUAGE_SHORT, LANGUAGE_LONG, true, LANGUAGE_DESCRIPTION);
        options.addOption(null, NO_OR_IMPORT_DUPLICATES, false, NO_OR_IMPORT_DUPLICATES_DESCRIPTION);
        options.addOption(null, NO_OR_IMPORT_EQ_SUGGESTIONS, false, NO_OR_IMPORT_EQ_SUGGESTIONS_DESCRIPTION);
        options.addOption(null, NO_OR_AUTO_APPROVE_IMPORTED, false, NO_OR_AUTO_APPROVE_IMPORTED_DESCRIPTIONS);
        return options;
    }

    private Options cmdDownload() {
        Options options = new Options();
        options.addOption(BRANCH_SHORT, BRANCH_LONG, true, BRANCH_DESCRIPTION);
        options.addOption(LANGUAGE_SHORT, LANGUAGE_LONG, true, LANGUAGE_DOWNLOAD_DESCRIPTION);
        options.addOption(null, IGNORE_MATCH_LONG, false, IGNORE_MATCH_DESCRIPTIONS);
        options.addOption(null, DRY_RUN_LONG, false, DRY_RUN_DESCRIPTION);
        options.addOption(null, TREE_LONG, false, TREE_DESCRIPTIONS);
        return options;
    }

    private Options cmdGenerate() {
        Options options = new Options();
        options.addOption(DESTINATION_SHORT, DESTINATION_LONG, true, DESTINATION_DESCRIPTION);
        return options;
    }

    private Options cmdLint() {
        Options options = new Options();
        options.addOption(null, CONFIG_LONG, true, CONFIG_DESCRIPTION);
        return options;
    }

    private Options cmdListProject() {
        Options options = new Options();
        options.addOption(BRANCH_SHORT, BRANCH_LONG, true, BRANCH_DESCRIPTION);
        options.addOption(null, TREE_LONG, false, TREE_DESCRIPTIONS);
        return options;
    }

    private Options cmdListTranslations() {
        Options options = new Options();
        options.addOption(null, TREE_LONG, false, TREE_DESCRIPTIONS);
        return options;
    }

    private Options cmdListSources() {
        Options options = new Options();
        options.addOption(null, TREE_LONG, false, TREE_DESCRIPTIONS);
        return options;
    }
}