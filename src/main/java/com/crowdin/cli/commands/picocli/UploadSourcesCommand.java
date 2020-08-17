package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.ClientAction;
import picocli.CommandLine;

class UploadSourcesCommand extends ClientActPlainMixin {

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...")
    protected String branch;

    @CommandLine.Option(names = {"--no-auto-update"}, negatable = true)
    protected boolean autoUpdate = true;

    @CommandLine.Option(names = {"--dryrun"})
    protected boolean dryrun;

    @CommandLine.Option(names = {"--tree"}, descriptionKey = "tree.dryrun")
    protected boolean treeView;

    @Override
    protected ClientAction getAction(Actions actions) {
        return (dryrun)
            ? actions.listSources(this.noProgress, this.treeView, plainView)
            : actions.uploadSources(this.branch, this.noProgress, this.autoUpdate, debug, plainView);
    }
}
