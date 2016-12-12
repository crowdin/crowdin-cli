package com.crowdin.cli.utils.tree.interfaces;

/**
 * @author ihor
 */
public interface Visitable<T> {

    void accept(Visitor<T> visitor);

}
