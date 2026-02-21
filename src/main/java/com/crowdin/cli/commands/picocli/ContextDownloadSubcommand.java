package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.functionality.FsFiles;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;

import java.io.File;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@CommandLine.Command(
        name = CommandNames.CONTEXT_DOWNLOAD,
        sortOptions = false
)
class ContextDownloadSubcommand extends ActCommandProject {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final Set<String> AVAILABLE_FORMATS = Set.of("jsonl");
    private static final Set<String> AVAILABLE_STATUSES = Set.of("ai", "empty", "manual");

    @CommandLine.Option(names = {"--to"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.context.download.to")
    protected File to = new File("crowdin-context.jsonl");

    @CommandLine.Option(names = {"-f", "--file"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.context.download.file")
    protected List<String> files;

    @CommandLine.Option(names = {"--label"}, paramLabel = "...", descriptionKey = "crowdin.context.download.label", order = -2)
    protected List<String> labelNames;

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.context.download.branch")
    protected String branchName;

    @CommandLine.Option(names = {"--croql"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.context.download.croql")
    protected String croql;

    @CommandLine.Option(names = {"--since"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.context.download.since")
    protected String since;

    @CommandLine.Option(names = {"--format"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.context.download.format")
    protected String format = "jsonl";

    @CommandLine.Option(names = {"--status"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.context.download.status")
    protected String status;

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

        if (format != null) {
            if (!AVAILABLE_FORMATS.contains(format)) {
                errors.add(RESOURCE_BUNDLE.getString("error.context.invalid_format"));
            }
        }

        if (status != null) {
            if (!AVAILABLE_STATUSES.contains(status)) {
                errors.add(RESOURCE_BUNDLE.getString("error.context.invalid_status"));
            }
        }

        return errors;
    }

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        var sinceDate = since != null ? LocalDate.parse(since, DATE_FORMAT) : null;
        return actions.contextDownload(to, files, labelNames, branchName, croql, sinceDate, status, format, new FsFiles(), plainView, noProgress);
    }
}
