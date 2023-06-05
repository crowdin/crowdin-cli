package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientDistribution;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.distributions.model.ExportMode;
import org.apache.logging.log4j.util.Strings;
import picocli.CommandLine;

import java.util.ArrayList;
import java.util.List;

@CommandLine.Command(
    name = CommandNames.DISTRIBUTION_ADD,
    sortOptions = false
)
class DistributionAddSubcommand extends ActCommandDistribution {

    @CommandLine.Parameters(descriptionKey = "crowdin.distribution.add.name")
    protected String name;

    @CommandLine.Option(names = {"--export-mode"}, paramLabel = "...", descriptionKey = "crowdin.distribution.add.export-mode", order = -2)
    protected ExportMode exportMode;

    @CommandLine.Option(names = {"--file"}, paramLabel = "...", descriptionKey = "crowdin.distribution.add.file-id", order = -2)
    protected List<Long> files;

//TODO: skip implementation until new changes in client

//    @CommandLine.Option(names = {"--format"}, paramLabel = "...", descriptionKey = "crowdin.distribution.add.format", order = -2)
//    protected String format;
//
//    @CommandLine.Option(names = {"--export-pattern"}, paramLabel = "...", descriptionKey = "crowdin.distribution.add.export-pattern", order = -2)
//    protected String exportPattern;
//
//    @CommandLine.Option(names = {"--label"}, paramLabel = "...", descriptionKey = "crowdin.distribution.add.label", order = -2)
//    protected List<Long> labels;

    @Override
    protected NewAction<ProjectProperties, ClientDistribution> getAction(Actions actions) {
        return actions.distributionAdd(name, exportMode, files);
    }

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();
        if (Strings.isEmpty(name)) {
            errors.add(RESOURCE_BUNDLE.getString("error.distribution.empty_name"));
        }
        if (files == null) {
            errors.add(RESOURCE_BUNDLE.getString("error.distribution.empty_fileId"));
        }
        return errors;
    }

}
