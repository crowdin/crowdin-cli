package com.crowdin.cli.utils.tree;

import com.crowdin.cli.utils.Utils;

import java.util.List;

public class DrawTree {

    public static List<String> draw(List<String> l) {
        if (l == null) {
            throw new NullPointerException("NPE in DrawTree.draw");
        }

        Tree<String> top = new Tree<>(".");
        Tree<String> current = top;

        for (String tree : l) {
            Tree<String> root = current;
            for (String data : tree.split(Utils.PATH_SEPARATOR_REGEX)) {
                current = current.child(data);
            }
            current = root;
        }
        return top.accept(new PrintIndentedVisitor());
    }
}
