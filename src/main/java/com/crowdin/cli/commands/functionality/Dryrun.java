package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.utils.tree.DrawTree;

import java.util.List;
import java.util.stream.Collectors;

import static com.crowdin.cli.utils.MessageSource.RESOURCE_BUNDLE;

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
            files.forEach(file -> System.out.println(String.format(RESOURCE_BUNDLE.getString("message.uploading_file"), file)));
        }
    }
}
