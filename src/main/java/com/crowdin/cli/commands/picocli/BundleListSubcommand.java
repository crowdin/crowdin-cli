package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientBundle;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.BUNDLE_LIST
)
class BundleListSubcommand extends ActCommandBundle {

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected NewAction<ProjectProperties, ClientBundle> getAction(Actions actions) {
        return actions.bundleList(this.plainView, this.isVerbose);
    }

    @Override
    protected boolean isAnsi() {
        return super.isAnsi() && !plainView;
    }

}
