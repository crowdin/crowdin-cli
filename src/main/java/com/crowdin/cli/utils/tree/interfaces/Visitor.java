package com.crowdin.cli.utils.tree.interfaces;

import com.crowdin.cli.utils.tree.Tree;

/**
 * @author ihor
 */
public interface Visitor<T> {

    Visitor<T> visitTree(Tree<T> tree);

    void visitData(Tree<T> parent, T data);

}
