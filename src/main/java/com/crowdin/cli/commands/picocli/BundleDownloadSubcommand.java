package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientBundle;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.actions.BundleDownloadAction;
import com.crowdin.cli.commands.functionality.FsFiles;
import com.crowdin.cli.properties.ProjectProperties;
import picocli.CommandLine;

@CommandLine.Command(
    name = CommandNames.DOWNLOAD,
    sortOptions = false
)
public class BundleDownloadSubcommand extends ActCommandBundle {

    @CommandLine.Parameters(descriptionKey = "crowdin.bundle.download.id")
    protected Long id;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @CommandLine.Option(names = {"--keep-archive"}, descriptionKey = "params.keepArchive")
    protected boolean keepArchive;

    @CommandLine.Option(names = {"--dryrun"})
    protected boolean dryrun;

    @Override
    protected NewAction<ProjectProperties, ClientBundle> getAction(Actions actions) {
        return new BundleDownloadAction(id, new FsFiles(), plainView, keepArchive, noProgress, dryrun);
    }
}
