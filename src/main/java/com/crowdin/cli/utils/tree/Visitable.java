package com.crowdin.cli.utils.tree;

import java.util.List;

interface Visitable<T> {

    <E> List<E> accept(Visitor<T, E> visitor);

}
