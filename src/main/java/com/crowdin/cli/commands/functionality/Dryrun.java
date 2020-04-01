package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.utils.tree.DrawTree;

import java.util.List;
import java.util.stream.Collectors;

import static com.crowdin.cli.utils.MessageSource.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

public abstract class Dryrun {

    protected abstract List<String> getFiles();

    public void run(boolean treeView) {
        List<String> files = getFiles()
            .stream()
            .map(f -> f.replaceAll("^[/\\\\]+", ""))
            .sorted()
            .collect(Collectors.toList());
        if (treeView) {
            (new DrawTree()).draw(files, 0);
        } else {
            files.forEach(file -> System.out.println(OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.uploading_file"), file))));
        }
    }
}
