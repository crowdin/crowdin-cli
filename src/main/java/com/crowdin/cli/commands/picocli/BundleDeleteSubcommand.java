package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientBundle;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import org.apache.logging.log4j.util.Strings;
import picocli.CommandLine;

import java.util.ArrayList;
import java.util.List;

@CommandLine.Command(
        name = CommandNames.DELETE,
        sortOptions = false
)
class BundleDeleteSubcommand extends ActCommandBundle {

    @CommandLine.Parameters(descriptionKey = "crowdin.bundle.delete.id")
    protected Long id;

    @Override
    protected NewAction<ProjectProperties, ClientBundle> getAction(Actions actions) {
        return actions.bundleDelete(id);
    }
}
