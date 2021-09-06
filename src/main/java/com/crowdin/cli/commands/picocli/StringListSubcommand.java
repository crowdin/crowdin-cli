package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.Utils;
import org.apache.commons.lang3.StringUtils;
import picocli.CommandLine;

import java.util.Collections;
import java.util.List;

@CommandLine.Command(
    name = CommandNames.STRING_LIST
)
class StringListSubcommand extends ActCommandProject {

    @CommandLine.Option(names = {"--file"}, paramLabel = "...")
    protected String file;

    @CommandLine.Option(names = {"--filter"}, paramLabel = "...")
    protected String filter;

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...")
    protected String branchName;

    @Override
    protected List<String> checkOptions() {
        if (file != null) {
            file = StringUtils.removeStart(Utils.normalizePath(file), Utils.PATH_SEPARATOR);
        }
        return Collections.emptyList();
    }

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        return actions.stringList(noProgress, isVerbose, file, filter, branchName);
    }
}
