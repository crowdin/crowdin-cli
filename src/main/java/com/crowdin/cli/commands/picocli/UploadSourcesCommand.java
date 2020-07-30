package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.actions.ClientAction;
import com.crowdin.cli.commands.actions.ListSourcesAction;
import com.crowdin.cli.commands.actions.UploadSourcesAction;
import picocli.CommandLine;

class UploadSourcesCommand extends ClientActCommand {

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...")
    protected String branch;

    @CommandLine.Option(names = {"--no-auto-update"}, negatable = true)
    protected boolean autoUpdate = true;

    @CommandLine.Option(names = {"--dryrun"})
    protected boolean dryrun;

    @CommandLine.Option(names = {"--tree"}, descriptionKey = "tree.dryrun")
    protected boolean treeView;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @Override
    protected ClientAction getAction() {
        return (dryrun)
            ? new ListSourcesAction(this.noProgress, this.treeView, plainView)
            : new UploadSourcesAction(this.branch, this.noProgress, this.autoUpdate, debug, plainView);
    }

    @Override
    protected boolean isAnsi() {
        return !plainView;
    }
}
