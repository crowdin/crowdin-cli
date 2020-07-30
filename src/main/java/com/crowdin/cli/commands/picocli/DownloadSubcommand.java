package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.actions.ClientAction;
import com.crowdin.cli.commands.actions.DownloadAction;
import com.crowdin.cli.commands.actions.ListTranslationsAction;
import com.crowdin.cli.commands.functionality.FsFiles;
import picocli.CommandLine;

@CommandLine.Command(
    name = "download",
    sortOptions = false,
    aliases = "pull")
class DownloadSubcommand extends ClientActCommand {

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...")
    protected String branchName;

    @CommandLine.Option(names = {"--ignore-match"})
    protected boolean ignoreMatch;

    @CommandLine.Option(names = {"-l", "--language"}, paramLabel = "...")
    protected String languageId;

    @CommandLine.Option(names = {"--dryrun"})
    protected boolean dryrun;

    @CommandLine.Option(names = {"--tree"}, descriptionKey = "tree.dryrun")
    protected boolean treeView;

    @CommandLine.Option(names = {"--skip-untranslated-strings"}, descriptionKey = "crowdin.download.skipUntranslatedStrings")
    protected Boolean skipTranslatedOnly;

    @CommandLine.Option(names = {"--skip-untranslated-files"}, descriptionKey = "crowdin.download.skipUntranslatedFiles")
    protected Boolean skipUntranslatedFiles;

    @CommandLine.Option(names = {"--export-only-approved"}, descriptionKey = "crowdin.download.exportOnlyApproved")
    protected Boolean exportApprovedOnly;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected ClientAction getAction() {
        return (dryrun)
            ? new ListTranslationsAction(noProgress, treeView, false, plainView)
            : new DownloadAction(
                new FsFiles(), noProgress, languageId, branchName, ignoreMatch, isVerbose,
                skipTranslatedOnly, skipUntranslatedFiles, exportApprovedOnly, plainView);
    }

    @Override
    protected boolean isAnsi() {
        return super.isAnsi() && !plainView;
    }
}
