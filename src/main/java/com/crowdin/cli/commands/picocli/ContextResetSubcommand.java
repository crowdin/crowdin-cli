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
        name = CommandNames.CONTEXT_RESET,
        sortOptions = false
)
class ContextResetSubcommand extends ActCommandProject {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @CommandLine.Option(names = {"-f", "--file"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.context.reset.file")
    protected List<String> files;

    @CommandLine.Option(names = {"--label"}, paramLabel = "...", descriptionKey = "crowdin.context.reset.label", order = -2)
    protected List<String> labelNames;

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.context.reset.branch")
    protected String branchName;

    @CommandLine.Option(names = {"--croql"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.context.reset.croql")
    protected String croql;

    @CommandLine.Option(names = {"--since"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.context.reset.since")
    protected String since;

    @CommandLine.Option(names = {"--dryrun"}, paramLabel = "...", order = -2)
    protected boolean dryrun;

    @CommandLine.Option(names = {"--all"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.context.reset.all")
    protected boolean all;

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

        var isAllEmpty = (files == null || files.isEmpty())
                && (labelNames == null || labelNames.isEmpty())
                && (branchName == null || branchName.isEmpty())
                && (croql == null || croql.isEmpty())
                && (since == null);

        if (isAllEmpty && !all) {
            errors.add(RESOURCE_BUNDLE.getString("error.context.no_all_flag"));
        }

        return errors;
    }

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        var sinceDate = since != null ? LocalDate.parse(since, DATE_FORMAT) : null;
        return actions.contextReset(files, labelNames, branchName, croql, sinceDate, dryrun, 100, plainView, noProgress);
    }
}
