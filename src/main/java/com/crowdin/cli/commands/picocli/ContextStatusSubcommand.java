package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@CommandLine.Command(
        name = CommandNames.CONTEXT_STATUS,
        sortOptions = false
)
class ContextStatusSubcommand extends ActCommandProject {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @CommandLine.Option(names = {"-f", "--file"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.context.status.file")
    protected List<String> files;

    @CommandLine.Option(names = {"--label"}, paramLabel = "...", descriptionKey = "crowdin.context.status.label", order = -2)
    protected List<String> labelNames;

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.context.status.branch")
    protected String branchName;

    @CommandLine.Option(names = {"--croql"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.context.status.croql")
    protected String croql;

    @CommandLine.Option(names = {"--since"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.context.status.since")
    protected String since;

    @CommandLine.Option(names = {"--by-file"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.context.status.byFile")
    protected boolean byFile;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();

        if (since != null) {
            try {
                LocalDate.parse(since, DATE_FORMAT);
            } catch (Exception e) {
                errors.add(RESOURCE_BUNDLE.getString("error.context.invalid_since"));
            }
        }

        return errors;
    }

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        var sinceDate = since != null ? LocalDate.parse(since, DATE_FORMAT) : null;
        return actions.contextStatus(files, labelNames, branchName, croql, sinceDate, byFile, plainView, noProgress);
    }
}
