package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.actions.ClientAction;
import com.crowdin.cli.commands.actions.ListTranslationsAction;
import com.crowdin.cli.commands.actions.UploadTranslationsAction;
import picocli.CommandLine;

@CommandLine.Command(
    name = "translations",
    sortOptions = false
)
class UploadTranslationsSubcommand extends ClientActCommand {

    @CommandLine.Option(names = {"--auto-approve-imported"}, negatable = true)
    protected boolean autoApproveImported;

    @CommandLine.Option(names = {"--import-eq-suggestions"}, negatable = true)
    protected boolean importEqSuggestions;

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...")
    protected String branch;

    @CommandLine.Option(names = {"-l", "--language"}, paramLabel = "...")
    protected String languageId;

    @CommandLine.Option(names = {"--dryrun"})
    protected boolean dryrun;

    @CommandLine.Option(names = {"--tree"}, descriptionKey = "tree.dryrun")
    protected boolean treeView;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected ClientAction getAction() {
        return (dryrun)
            ? new ListTranslationsAction(noProgress, treeView, true, plainView)
            : new UploadTranslationsAction(noProgress, languageId, branch, importEqSuggestions, autoApproveImported, debug, plainView);
    }

    @Override
    protected boolean isAnsi() {
        return !plainView;
    }
}
