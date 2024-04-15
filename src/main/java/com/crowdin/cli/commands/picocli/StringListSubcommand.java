package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.Utils;
import org.apache.commons.lang3.StringUtils;
import picocli.CommandLine;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static java.util.Objects.nonNull;

@CommandLine.Command(
    name = CommandNames.LIST,
    sortOptions = false
)
class StringListSubcommand extends ActCommandProject {

    @CommandLine.Option(names = {"--file"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.string.list.file")
    protected String file;

    @CommandLine.Option(names = {"--filter"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.string.list.filter")
    protected String filter;

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...", order = -2, descriptionKey = "branch")
    protected String branchName;

    @CommandLine.Option(names = {"--label"}, paramLabel = "...", descriptionKey = "crowdin.string.list.label", order = -2)
    protected List<String> labelNames;

    @CommandLine.Option(names = {"--croql"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.string.list.croql")
    protected String croql;

    @CommandLine.Option(names = {"--directory"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.string.list.directory")
    protected Long directory;

    @CommandLine.Option(names = {"--scope"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.string.list.scope")
    protected String scope;

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();
        if (file != null) {
            file = StringUtils.removeStart(Utils.normalizePath(file), Utils.PATH_SEPARATOR);
        }
        if (nonNull(directory) && nonNull(file)) {
            errors.add(RESOURCE_BUNDLE.getString("error.status.only_one_allowed"));
        }
        return errors;
    }

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        return actions.stringList(noProgress, isVerbose, file, filter, branchName, labelNames, croql, directory, scope);
    }
}
