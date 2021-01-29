package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.functionality.FsFiles;
import com.crowdin.cli.properties.ParamsWithFiles;
import com.crowdin.cli.properties.PropertiesWithFiles;
import picocli.CommandLine;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

@CommandLine.Command(
    name = CommandNames.DOWNLOAD,
    sortOptions = false,
    aliases = CommandNames.ALIAS_DOWNLOAD,
    subcommands = {
        DownloadTargetsSubcommand.class,
        DownloadSourcesSubcommand.class
    }
)
class DownloadSubcommand extends ActCommandWithFiles {

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...")
    protected String branchName;

    @CommandLine.Option(names = {"--ignore-match"})
    protected boolean ignoreMatch;

    @CommandLine.Option(names = {"-l", "--language"}, paramLabel = "...")
    protected String languageId;

    @CommandLine.Option(names = {"--pseudo"}, descriptionKey = "crowdin.download.pseudo")
    protected boolean pseudo;

    @CommandLine.Option(names = {"--dryrun"})
    protected boolean dryrun;

    @CommandLine.Option(names = {"--tree"}, descriptionKey = "tree.dryrun")
    protected boolean treeView;

    @CommandLine.Option(names = {"--skip-untranslated-strings"}, descriptionKey = "params.skipUntranslatedStrings")
    protected Boolean skipTranslatedOnly;

    @CommandLine.Option(names = {"--skip-untranslated-files"}, descriptionKey = "params.skipUntranslatedFiles")
    protected Boolean skipUntranslatedFiles;

    @CommandLine.Option(names = {"--export-only-approved"}, descriptionKey = "params.exportOnlyApproved")
    protected Boolean exportApprovedOnly;

    @CommandLine.Option(names = {"--all"})
    protected boolean all;

    @Override
    protected NewAction<PropertiesWithFiles, ProjectClient> getAction(Actions actions) {
        return (dryrun)
            ? actions.listTranslations(noProgress, treeView, false, plainView, all, true)
            : actions.download(new FsFiles(), noProgress, languageId, pseudo, branchName, ignoreMatch, isVerbose, plainView, all);
    }

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected boolean isAnsi() {
        return super.isAnsi() && !plainView;
    }

    @Override
    protected void updateParams(ParamsWithFiles params) {
        params.setExportOptions(skipTranslatedOnly, skipUntranslatedFiles, exportApprovedOnly);
    }
}
