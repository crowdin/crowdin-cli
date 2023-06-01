package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ParamsWithFiles;
import com.crowdin.cli.properties.PropertiesWithFiles;
import picocli.CommandLine;

import java.util.List;

@CommandLine.Command(
  sortOptions = false
)
class UploadSourcesCommand extends ActCommandWithFiles {

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...", order = -2)
    protected String branch;

    @CommandLine.Option(names = {"--delete-obsolete"}, descriptionKey = "crowdin.upload.sources.delete-obsolete", order = -2)
    protected boolean deleteObsolete;

    @CommandLine.Option(names = {"--no-auto-update"}, negatable = true, order = -2)
    protected boolean autoUpdate = true;

    @CommandLine.Option(names = {"--tree"}, descriptionKey = "tree.dryrun", order = -2)
    protected boolean treeView;

    @CommandLine.Option(names = {"--label"}, descriptionKey = "params.label", paramLabel = "...", order = -2)
    protected List<String> labels;

    @CommandLine.Option(names = {"--excluded-language"}, descriptionKey = "params.excluded-languages", paramLabel = "...", order = -2)
    protected List<String> excludedLanguages;

    @CommandLine.Option(names = {"--dryrun"})
    protected boolean dryrun;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected NewAction<PropertiesWithFiles, ProjectClient> getAction(Actions actions) {
        return (dryrun)
            ? actions.listSources(this.deleteObsolete, this.branch, this.noProgress, this.treeView, plainView)
            : actions.uploadSources(this.branch, this.deleteObsolete, this.noProgress, this.autoUpdate, debug, plainView);
    }

    @Override
    protected final boolean isAnsi() {
        return super.isAnsi() && !plainView;
    }

    @Override
    protected void updateParams(ParamsWithFiles params) {
        params.setLabels(labels);
        params.setExcludedTargetLanguages(excludedLanguages);
    }
}
