package com.crowdin.cli.utils.tree;

import com.crowdin.cli.utils.Utils;

import java.io.File;
import java.util.List;

/**
 * @author ihor
 */
public class DrawTree {

    public void draw(List<String> l, int ident) {

        Tree<String> top = new Tree<>(".");
        Tree<String> current = top;

        for (String tree : l) {
            Tree<String> root = current;
            for (String data : tree.split(Utils.PATH_SEPARATOR_REGEX)) {
                current = current.child(data);
            }
            current = root;
        }
        top.accept(new PrintIndentedVisitor(ident));
    }
}
