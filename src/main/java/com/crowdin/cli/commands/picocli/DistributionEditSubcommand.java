package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientDistribution;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.distributions.model.ExportMode;
import picocli.CommandLine;

import java.util.ArrayList;
import java.util.List;

@CommandLine.Command(
    name = CommandNames.EDIT,
    sortOptions = false
)
class DistributionEditSubcommand extends ActCommandDistribution {

    @CommandLine.Parameters(descriptionKey = "crowdin.distribution.edit.hash")
    protected String hash;

    @CommandLine.Option(names = {"--name"}, paramLabel = "...", descriptionKey = "crowdin.distribution.edit.name", order = -2)
    protected String name;

    @CommandLine.Option(names = {"--export-mode"}, paramLabel = "...", descriptionKey = "crowdin.distribution.edit.export-mode", order = -2)
    protected ExportMode exportMode;

    @CommandLine.Option(names = {"--file"}, paramLabel = "...", descriptionKey = "crowdin.distribution.edit.file", order = -2)
    protected List<String> files;

    @CommandLine.Option(names = {"--bundle-id"}, paramLabel = "...", descriptionKey = "crowdin.distribution.edit.bundle-id", order = -2)
    protected List<Integer> bundleIds;

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...", descriptionKey = "branch", order = -2)
    protected String branch;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected NewAction<ProjectProperties, ClientDistribution> getAction(Actions actions) {
        return actions.distributionEdit(hash, noProgress, plainView, name, exportMode, files, bundleIds, branch);
    }

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();
        if (name == null && exportMode == null && files == null && bundleIds == null) {
            errors.add(RESOURCE_BUNDLE.getString("error.distribution.no_edit"));
        }
        return errors;
    }
}
