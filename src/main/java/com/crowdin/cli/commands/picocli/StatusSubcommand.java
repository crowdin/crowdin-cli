package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.STATUS,
    sortOptions = false,
    subcommands = {
        StatusTranslationSubcommand.class,
        StatusProofreadingSubcommand.class
    }
)
class StatusSubcommand extends ActCommandProject {

    @CommandLine.Option(names = {"-l", "--language"}, paramLabel = "...", order = -2)
    protected String languageId;

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...", order = -2)
    protected String branchName;

    @CommandLine.Option(names = {"--fail-if-incomplete"}, paramLabel = "...", order = -2)
    protected boolean failIfIncomplete;

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        return actions.status(noProgress, branchName, languageId, isVerbose, true, true, failIfIncomplete);
    }
}
