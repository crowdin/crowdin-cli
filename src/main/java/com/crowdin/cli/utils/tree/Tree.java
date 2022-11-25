package com.crowdin.cli.utils.tree;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

class Tree<T> implements Visitable<T> {
    private final Set<Tree<T>> children = new LinkedHashSet<>();
    private Tree<T> lastChild;
    private final T data;

    Tree(T data) {
        this.data = data;
    }

    @Override
    public <E> List<E> accept(Visitor<T, E> visitor) {
        List<E> result = new ArrayList<>();
        result.add(visitor.visitData(this, data));

        for (Tree<T> child : children) {
            Visitor<T, E> childVisitor = visitor.visitTree(child, false);
            result.addAll(child.accept(childVisitor));
        }
        if (lastChild != null) {
            Visitor<T, E> childVisitor = visitor.visitTree(lastChild, true);
            result.addAll(lastChild.accept(childVisitor));
        }
        return result;
    }

    public Tree<T> child(T data) {
        for (Tree<T> child : children) {
            if (child.data.equals(data)) {
                return child;
            }
        }
        if (lastChild != null && lastChild.data.equals(data)) {
            return lastChild;
        }

        if (lastChild != null) {
            children.add(lastChild);
        }
        lastChild = new Tree<>(data);
        return lastChild;
    }
}
