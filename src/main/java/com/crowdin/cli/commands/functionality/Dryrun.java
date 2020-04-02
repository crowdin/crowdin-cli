package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.utils.tree.DrawTree;

import java.util.List;
import java.util.stream.Collectors;

import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;


public abstract class Dryrun {

    protected abstract List<String> getFiles();

    private String message_key;

    protected Dryrun() {
        this("message.uploading_file");
    }

    protected Dryrun(String message_key) {
        this.message_key = message_key;
    }

    public void run(boolean treeView) {
        List<String> files = getFiles()
            .stream()
            .map(f -> f.replaceAll("^[/\\\\]+", ""))
            .sorted()
            .collect(Collectors.toList());
        if (treeView) {
            DrawTree.draw(files);
        } else {
            files.forEach(file -> System.out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString(message_key), file))));
        }
    }
}
