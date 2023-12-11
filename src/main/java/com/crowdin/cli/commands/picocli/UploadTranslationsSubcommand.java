package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.PropertiesWithFiles;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.UPLOAD_TRANSLATIONS,
    sortOptions = false
)
class UploadTranslationsSubcommand extends ActCommandWithFiles {

    @CommandLine.Option(names = {"--auto-approve-imported"}, negatable = true, order = -2)
    protected boolean autoApproveImported;

    @CommandLine.Option(names = {"--import-eq-suggestions"}, negatable = true, order = -2)
    protected boolean importEqSuggestions;

    @CommandLine.Option(names = {"--translate-hidden"}, negatable = true, order = -2)
    protected boolean translateHidden;

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...", order = -2)
    protected String branch;

    @CommandLine.Option(names = {"-l", "--language"}, paramLabel = "...", order = -4)
    protected String languageId;

    @CommandLine.Option(names = {"--dryrun"})
    protected boolean dryrun;

    @CommandLine.Option(names = {"--tree"}, descriptionKey = "tree.dryrun")
    protected boolean treeView;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected NewAction<PropertiesWithFiles, ProjectClient> getAction(Actions actions) {
        return (dryrun)
            ? actions.listTranslations(noProgress, treeView, true, plainView, false, false)
            : actions.uploadTranslations(noProgress, languageId, branch, importEqSuggestions, autoApproveImported, translateHidden, debug, plainView);
    }

    @Override
    protected final boolean isAnsi() {
        return super.isAnsi() && !plainView;
    }
}
