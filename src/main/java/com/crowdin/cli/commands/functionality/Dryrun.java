package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.utils.tree.DrawTree;

import java.util.Collections;
import java.util.List;

public abstract class Dryrun {

    protected abstract List<String> getFiles();

    public void run(boolean treeView) {
        List<String> files = getFiles();
        Collections.sort(files);
        if (treeView) {
            (new DrawTree()).draw(files, 0);
        } else {
            files.forEach(System.out::println);
        }
    }
}
