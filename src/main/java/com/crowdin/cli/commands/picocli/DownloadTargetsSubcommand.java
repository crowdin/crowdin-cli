package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.functionality.FsFiles;
import com.crowdin.cli.properties.PropertiesWithTargets;
import picocli.CommandLine;

import java.util.ArrayList;
import java.util.List;

@CommandLine.Command(
    name = CommandNames.DOWNLOAD_TARGETS,
    sortOptions = false
)
public class DownloadTargetsSubcommand extends ActCommandWithTargets {

    @CommandLine.Parameters(defaultValue = BaseCli.ALL, descriptionKey = "crowdin.download.targets.targetNames")
    protected List<String> targetNames;

    @CommandLine.Option(names = {"-l", "--language"}, paramLabel = "...", defaultValue = BaseCli.ALL)
    protected List<String> langIds;

    @Override
    protected NewAction<PropertiesWithTargets, ProjectClient> getAction(Actions actions) {
        return actions.downloadTargets(
            targetNames, new FsFiles(), noProgress, langIds, isVerbose, plainView, debug);
    }

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected boolean isAnsi() {
        return super.isAnsi() && !plainView;
    }
}
