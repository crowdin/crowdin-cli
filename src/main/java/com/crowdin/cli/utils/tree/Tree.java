package com.crowdin.cli.utils.tree;

import com.crowdin.cli.utils.tree.interfaces.Visitable;
import com.crowdin.cli.utils.tree.interfaces.Visitor;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * @author ihor
 */
public class Tree<T> implements Visitable<T> {
    private final Set<Tree> children = new LinkedHashSet<>();
    private final T data;

    Tree(T data) {
        this.data = data;
    }

    @Override
    public void accept(Visitor<T> visitor) {
        visitor.visitData(this, data);

        for (Tree child : children) {
            Visitor<T> childVisitor = visitor.visitTree(child);
            child.accept(childVisitor);
        }
    }

    Tree child(T data) {
        for (Tree child : children) {
            if (child.data.equals(data)) {
                return child;
            }
        }

        return child(new Tree(data));
    }

    Tree child(Tree<T> child) {
        children.add(child);
        return child;
    }
}
