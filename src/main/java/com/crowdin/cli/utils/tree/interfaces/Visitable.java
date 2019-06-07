package com.crowdin.cli.utils.tree.interfaces;


public interface Visitable<T> {

    void accept(Visitor<T> visitor);

}
