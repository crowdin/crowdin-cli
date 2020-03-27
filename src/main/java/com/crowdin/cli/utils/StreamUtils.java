package com.crowdin.cli.utils;

import java.util.Map;
import java.util.stream.Collectors;

public class StreamUtils {

    public static <K, V> Map<V, K> reverseMap(Map<K, V> map) {
        return map.entrySet().stream().collect(Collectors.toMap(Map.Entry::getValue, Map.Entry::getKey));
    }
}
