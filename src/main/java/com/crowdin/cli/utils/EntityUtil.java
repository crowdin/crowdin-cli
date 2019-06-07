package com.crowdin.cli.utils;


import java.util.Collection;
import java.util.Optional;
import java.util.function.Predicate;

public class EntityUtil {

    public static <T> Optional<T> find(Predicate<T> predicate, Collection<T> entities) {
        return entities.stream()
                .filter(predicate)
                .findFirst();
    }
}
