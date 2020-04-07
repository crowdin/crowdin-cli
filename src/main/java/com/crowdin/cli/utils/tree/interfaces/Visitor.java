package com.crowdin.cli.utils.tree.interfaces;

import com.crowdin.cli.utils.tree.Tree;


public interface Visitor<T, E> {

    Visitor<T, E> visitTree(Tree<T> tree, boolean last);

    E visitData(Tree<T> parent, T data);

}
