package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.utils.tree.DrawTree;
import org.apache.commons.lang3.StringUtils;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

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
            files.forEach(System.out::println);
        }
    }
}
