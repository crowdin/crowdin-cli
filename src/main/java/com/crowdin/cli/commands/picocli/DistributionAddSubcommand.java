package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientDistribution;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.distributions.model.ExportMode;
import org.apache.logging.log4j.util.Strings;
import picocli.CommandLine;

import java.util.ArrayList;
import java.util.List;

import static com.crowdin.client.distributions.model.ExportMode.BUNDLE;
import static com.crowdin.client.distributions.model.ExportMode.DEFAULT;

@CommandLine.Command(
    name = CommandNames.ADD,
    sortOptions = false
)
class DistributionAddSubcommand extends ActCommandDistribution {

    @CommandLine.Parameters(descriptionKey = "crowdin.distribution.add.name")
    protected String name;

    @CommandLine.Option(names = {"--export-mode"}, paramLabel = "...", descriptionKey = "crowdin.distribution.add.export-mode", defaultValue = "default", order = -2)
    protected ExportMode exportMode;

    @CommandLine.Option(names = {"--file"}, paramLabel = "...", descriptionKey = "crowdin.distribution.add.file", order = -2)
    protected List<String> files;

    @CommandLine.Option(names = {"--bundle-id"}, paramLabel = "...", descriptionKey = "crowdin.distribution.add.bundle-id", order = -2)
    protected List<Integer> bundleIds;

    @CommandLine.Option(names = {"--branch"}, paramLabel = "...", descriptionKey = "branch", order = -2)
    protected String branch;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected NewAction<ProjectProperties, ClientDistribution> getAction(Actions actions) {
        Outputter out = new PicocliOutputter(System.out, isAnsi());
        ProjectClient projectClient = this.getProjectClient(this.getProperties(propertiesBuilders, out));

        return actions.distributionAdd(noProgress, plainView, name, exportMode, files, bundleIds, branch, projectClient);
    }

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();

        if (Strings.isEmpty(name)) {
            errors.add(RESOURCE_BUNDLE.getString("error.distribution.empty_name"));
        }

        if (exportMode == BUNDLE && bundleIds == null) {
            errors.add(RESOURCE_BUNDLE.getString("error.distribution.empty_bundle_ids"));
        }

        if (exportMode == BUNDLE && files != null) {
            errors.add(RESOURCE_BUNDLE.getString("error.distribution.incorrect_file_command_usage"));
        }

        if (exportMode == DEFAULT && bundleIds != null) {
            errors.add(RESOURCE_BUNDLE.getString("error.distribution.incorrect_bundle_id_command_usage"));
        }

        return errors;
    }
}
