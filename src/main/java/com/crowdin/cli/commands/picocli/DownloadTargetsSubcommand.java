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

    @CommandLine.Parameters(defaultValue = BaseCli.ALL)
    protected List<String> targetNames;

    @CommandLine.Option(names = {"-l", "--lang"}, paramLabel = "...", required = true)
    protected List<String> langIds;

    @CommandLine.Option(names = {"--skip-untranslated-strings"}, descriptionKey = "crowdin.download.skipUntranslatedStrings")
    protected Boolean skipTranslatedOnly;

    @CommandLine.Option(names = {"--skip-untranslated-files"}, descriptionKey = "crowdin.download.skipUntranslatedFiles")
    protected Boolean skipUntranslatedFiles;

    @CommandLine.Option(names = {"--export-only-approved"}, descriptionKey = "crowdin.download.exportOnlyApproved")
    protected Boolean exportApprovedOnly;

    @Override
    protected NewAction<PropertiesWithTargets, ProjectClient> getAction(Actions actions) {
        return actions.downloadTargets(
            targetNames, new FsFiles(), noProgress, langIds, isVerbose, skipTranslatedOnly,
            skipUntranslatedFiles, exportApprovedOnly, plainView, debug);
    }

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected boolean isAnsi() {
        return super.isAnsi() && !plainView;
    }
}
