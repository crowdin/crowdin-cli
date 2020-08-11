package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.ClientAction;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.UPLOAD_TRANSLATIONS,
    sortOptions = false
)
class UploadTranslationsSubcommand extends ClientActPlainMixin {

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

    @Override
    protected ClientAction getAction(Actions actions) {
        return (dryrun)
            ? actions.listTranslations(noProgress, treeView, true, plainView)
            : actions.uploadTranslations(noProgress, languageId, branch, importEqSuggestions, autoApproveImported, debug, plainView);
    }
}
