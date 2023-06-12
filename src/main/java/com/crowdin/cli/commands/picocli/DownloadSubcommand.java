package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.functionality.FsFiles;
import com.crowdin.cli.properties.ParamsWithFiles;
import com.crowdin.cli.properties.PropertiesWithFiles;
import org.apache.commons.lang3.ArrayUtils;
import picocli.CommandLine;

import java.util.ArrayList;
import java.util.List;

@CommandLine.Command(
    name = CommandNames.DOWNLOAD,
    sortOptions = false,
    aliases = CommandNames.ALIAS_DOWNLOAD,
    subcommands = {
        DownloadTargetsSubcommand.class,
        DownloadBundleSubcommand.class,
        DownloadSourcesSubcommand.class
    }
)
class DownloadSubcommand extends ActCommandWithFiles {

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...", order = -2)
    protected String branchName;

    @CommandLine.Option(names = {"--ignore-match"}, order = -2)
    protected boolean ignoreMatch;

    @CommandLine.Option(names = {"-l", "--language"}, paramLabel = "...", order = -2)
    protected List<String> languageIds;

    @CommandLine.Option(names = {"-e", "--exclude-language"}, paramLabel = "...", order = -2)
    protected List<String> excludeLanguageIds;

    @CommandLine.Option(names = {"--pseudo"}, descriptionKey = "crowdin.download.pseudo", order = -2)
    protected boolean pseudo;

    @CommandLine.Option(names = {"--skip-untranslated-strings"}, descriptionKey = "params.skipUntranslatedStrings", order = -2)
    protected Boolean skipTranslatedOnly;

    @CommandLine.Option(names = {"--skip-untranslated-files"}, descriptionKey = "params.skipUntranslatedFiles", order = -2)
    protected Boolean skipUntranslatedFiles;

    @CommandLine.Option(names = {"--export-only-approved"}, descriptionKey = "params.exportOnlyApproved", order = -2)
    protected Boolean exportApprovedOnly;

    @CommandLine.Option(names = {"--keep-archive"}, descriptionKey = "params.keepArchive", order = -2)
    protected boolean keepArchive;

    @CommandLine.Option(names = {"--all"}, order = -2)
    protected boolean all;

    @CommandLine.Option(names = {"--dryrun"})
    protected boolean dryrun;

    @CommandLine.Option(names = {"--tree"}, descriptionKey = "tree.dryrun")
    protected boolean treeView;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected NewAction<PropertiesWithFiles, ProjectClient> getAction(Actions actions) {
        return (dryrun)
            ? actions.listTranslations(noProgress, treeView, false, plainView, all, true)
            : actions.download(new FsFiles(), noProgress, languageIds, excludeLanguageIds, pseudo, branchName, ignoreMatch, isVerbose, plainView, all, keepArchive);
    }

    @Override
    protected boolean isAnsi() {
        return super.isAnsi() && !plainView;
    }

    @Override
    protected void updateParams(ParamsWithFiles params) {
        params.setExportOptions(skipTranslatedOnly, skipUntranslatedFiles, exportApprovedOnly);
    }

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();
        if (languageIds != null && excludeLanguageIds != null) {
            errors.add(RESOURCE_BUNDLE.getString("error.download.include_exclude_lang_conflict"));
        }
        return errors;
    }
}
