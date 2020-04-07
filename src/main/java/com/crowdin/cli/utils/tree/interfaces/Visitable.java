package com.crowdin.cli.utils.tree.interfaces;


import java.util.List;

public interface Visitable<T> {

    <E> List<E> accept(Visitor<T, E> visitor);

}
