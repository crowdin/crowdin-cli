package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ParamsWithFiles;
import com.crowdin.cli.properties.PropertiesWithFiles;
import picocli.CommandLine;

import java.util.List;

class UploadSourcesCommand extends ActCommandWithFiles {

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...")
    protected String branch;

    @CommandLine.Option(names = {"--delete-obsolete"}, descriptionKey = "crowdin.upload.sources.delete-obsolete")
    protected boolean deleteObsolete;

    @CommandLine.Option(names = {"--no-auto-update"}, negatable = true)
    protected boolean autoUpdate = true;

    @CommandLine.Option(names = {"--dryrun"})
    protected boolean dryrun;

    @CommandLine.Option(names = {"--tree"}, descriptionKey = "tree.dryrun")
    protected boolean treeView;

    @CommandLine.Option(names = {"--label"}, descriptionKey = "params.label", paramLabel = "...")
    protected List<String> labels;

    @CommandLine.Option(names = {"--excluded-language"}, descriptionKey = "params.excluded-languages", paramLabel = "...")
    protected List<String> excludedLanguages;

    @Override
    protected NewAction<PropertiesWithFiles, ProjectClient> getAction(Actions actions) {
        return (dryrun)
            ? actions.listSources(this.noProgress, this.treeView, plainView)
            : actions.uploadSources(this.branch, this.deleteObsolete, this.noProgress, this.autoUpdate, debug, plainView);
    }

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

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
