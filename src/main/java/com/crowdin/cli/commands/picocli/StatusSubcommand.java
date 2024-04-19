package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;

import java.util.ArrayList;
import java.util.List;

import static java.util.Objects.nonNull;

@CommandLine.Command(
    name = CommandNames.STATUS,
    sortOptions = false,
    subcommands = {
        StatusTranslationSubcommand.class,
        StatusProofreadingSubcommand.class
    }
)
class StatusSubcommand extends ActCommandProject {

    @CommandLine.Option(names = {"-l", "--language"}, paramLabel = "...", descriptionKey = "crowdin.status.language", order = -2)
    protected String languageId;

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...", order = -2)
    protected String branchName;

    @CommandLine.Option(names = {"-f", "--file"}, paramLabel = "...", descriptionKey = "crowdin.status.file-path", order = -2)
    protected String file;

    @CommandLine.Option(names = {"-d", "--directory"}, paramLabel = "...", descriptionKey = "crowdin.status.directory-path", order = -2)
    protected String directory;

    @CommandLine.Option(names = {"--fail-if-incomplete"}, paramLabel = "...", descriptionKey = "crowdin.status.fail-if-incomplete", order = -2)
    protected boolean failIfIncomplete;

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        return actions.status(noProgress, branchName, languageId, file, directory, isVerbose, true, true, failIfIncomplete);
    }

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();
        if (nonNull(directory) && nonNull(file)) {
            errors.add(RESOURCE_BUNDLE.getString("error.status.only_one_allowed"));
        }
        return errors;
    }
}
