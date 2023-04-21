package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.functionality.FsFiles;
import com.crowdin.cli.properties.ParamsWithTargets;
import com.crowdin.cli.properties.PropertiesWithTargets;
import picocli.CommandLine;

import java.util.List;

import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;
import static java.lang.System.out;

@Deprecated
@CommandLine.Command(
    name = CommandNames.DOWNLOAD_TARGETS,
    sortOptions = false,
    hidden = true
)
public class DownloadTargetsSubcommand extends ActCommandWithTargets {

    @CommandLine.Parameters(defaultValue = BaseCli.ALL, descriptionKey = "crowdin.download.targets.targetNames")
    protected List<String> targetNames;

    @CommandLine.Option(names = {"-l", "--language"}, paramLabel = "...", defaultValue = BaseCli.ALL)
    protected List<String> langIds;

    @CommandLine.Option(names = {"--skip-untranslated-strings"}, descriptionKey = "params.skipUntranslatedStrings")
    protected Boolean skipTranslatedOnly;

    @CommandLine.Option(names = {"--skip-untranslated-files"}, descriptionKey = "params.skipUntranslatedFiles")
    protected Boolean skipUntranslatedFiles;

    @CommandLine.Option(names = {"--export-only-approved"}, descriptionKey = "params.exportOnlyApproved")
    protected Boolean exportApprovedOnly;

    @CommandLine.Option(names = {"--branch", "-b"}, paramLabel = "...", descriptionKey = "branch")
    protected String branchName;

    @Override
    protected NewAction<PropertiesWithTargets, ProjectClient> getAction(Actions actions) {
        out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.target_deprecated")));
        return actions.downloadTargets(
            targetNames, new FsFiles(), noProgress, langIds, isVerbose, plainView, debug, branchName);
    }

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected boolean isAnsi() {
        return super.isAnsi() && !plainView;
    }

    @Override
    protected void updateParams(ParamsWithTargets params) {
        params.setExportOptions(skipTranslatedOnly, skipUntranslatedFiles, exportApprovedOnly);
    }
}
