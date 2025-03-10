package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.functionality.FsFiles;
import com.crowdin.cli.properties.ParamsWithFiles;
import com.crowdin.cli.properties.PropertiesWithFiles;
import picocli.CommandLine;
import picocli.CommandLine.Command;

import java.util.ArrayList;
import java.util.List;

@Command(
    name = CommandNames.TRANSLATIONS,
    sortOptions = false
)
public class DownloadTranslationsSubcommand extends ActCommandWithFiles {

    @CommandLine.Option(names = {"-b", "--branch"}, descriptionKey = "branch", paramLabel = "...", order = -2)
    protected String branchName;

    @CommandLine.Option(names = {"--ignore-match"}, descriptionKey = "crowdin.download.ignore-match", order = -2)
    protected boolean ignoreMatch;

    @CommandLine.Option(names = {"-l", "--language"}, descriptionKey = "crowdin.download.language", paramLabel = "...", order = -2)
    protected List<String> languageIds;

    @CommandLine.Option(names = {"-e", "--exclude-language"}, descriptionKey = "crowdin.download.exclude-language", paramLabel = "...", order = -2)
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

    @CommandLine.Option(names = {"--all"}, descriptionKey = "crowdin.download.all", order = -2)
    protected boolean all;

    @CommandLine.Option(names = {"--dryrun"}, descriptionKey = "dryrun")
    protected boolean dryrun;

    @CommandLine.Option(names = {"--tree"}, descriptionKey = "tree.dryrun")
    protected boolean treeView;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected NewAction<PropertiesWithFiles, ProjectClient> getAction(Actions actions) {
        return (dryrun)
            ? actions.listTranslations(noProgress, treeView, false, plainView, all, true, false)
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
