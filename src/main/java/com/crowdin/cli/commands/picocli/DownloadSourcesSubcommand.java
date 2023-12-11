package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.actions.DownloadSourcesAction;
import com.crowdin.cli.commands.functionality.FsFiles;
import com.crowdin.cli.properties.PropertiesWithFiles;
import picocli.CommandLine;

@CommandLine.Command(
    name = "sources",
    sortOptions = false
)
public class DownloadSourcesSubcommand extends ActCommandWithFiles {

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...", order = -2)
    protected String branchName;

    @CommandLine.Option(names = {"--reviewed"}, descriptionKey = "params.reviewedSources", order = -2)
    protected boolean reviewed;

    @CommandLine.Option(names = {"--dryrun"})
    protected boolean dryrun;

    @Override
    protected NewAction<PropertiesWithFiles, ProjectClient> getAction(Actions actions) {
        return new DownloadSourcesAction(new FsFiles(), noProgress, plainView, branchName, debug, reviewed, dryrun);
    }

    @Override
    protected boolean isAnsi() {
        return super.isAnsi() && !plainView;
    }
}
