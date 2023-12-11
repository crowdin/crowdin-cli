package com.crowdin.cli.utils.tree;

interface Visitor<T, E> {

    Visitor<T, E> visitTree(Tree<T> tree, boolean last);

    E visitData(Tree<T> parent, T data);

}
