package com.crowdin.cli.utils.tree;

import com.crowdin.cli.utils.tree.interfaces.Visitable;
import com.crowdin.cli.utils.tree.interfaces.Visitor;

import java.util.LinkedHashSet;
import java.util.Set;


public class Tree<T> implements Visitable<T> {
    private final Set<Tree<T>> children = new LinkedHashSet<>();
    private final T data;

    Tree(T data) {
        this.data = data;
    }

    @Override
    public void accept(Visitor<T> visitor) {
        visitor.visitData(this, data);

        for (Tree<T> child : children) {
            Visitor<T> childVisitor = visitor.visitTree(child);
            child.accept(childVisitor);
        }
    }

    Tree<T> child(T data) {
        for (Tree<T> child : children) {
            if (child.data.equals(data)) {
                return child;
            }
        }

        Tree<T> child = new Tree(data);
        children.add(child);
        return child;
    }
}
