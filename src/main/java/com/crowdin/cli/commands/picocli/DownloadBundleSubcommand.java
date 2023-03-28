package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientBundle;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.actions.DownloadBundleAction;
import com.crowdin.cli.commands.functionality.FsFiles;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.BUNDLE,
    sortOptions = false
)
public class DownloadBundleSubcommand extends ActCommandBundle {

    @CommandLine.Parameters(descriptionKey = "crowdin.bundle.download.id")
    protected Long id;

    @Override
    protected NewAction<ProjectProperties, ClientBundle> getAction(Actions actions) {
        return new DownloadBundleAction(id, new FsFiles(), noProgress);
    }
}
