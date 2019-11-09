package com.crowdin.cli.utils;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;

public class CacheUtil {

    private static final Map<String, Map<?, ?>> STORAGE = new ConcurrentHashMap<>();

    @SuppressWarnings("unchecked")
    private static <K, V> Map<K, V> getCache(String key) {
        return (Map<K, V>) STORAGE.computeIfAbsent(key, k -> new ConcurrentHashMap<>());
    }

    /**
     * Looks for cache by cache name in storage (or creates new one if such does not exists)
     * then looks into cache and returns associated value by key or,
     * if the specified key is not already associated with a value,
     * attempts to compute its value using the given mapping
     * function and enters it into this cache
     *
     * @param k               cache name
     * @param key             key with which the specified value is to be associated
     * @param mappingFunction the function to compute a value
     * @param <K>             key type
     * @param <V>             value type
     * @return the current (existing or computed) value associated with
     * the specified key, or null if the computed value is null
     */
    public static <K, V> V computeIfAbsent(String k, K key, Function<? super K, ? extends V> mappingFunction) {
        Map<K, V> map = CacheUtil.getCache(k);
        return map.computeIfAbsent(key, mappingFunction);
    }
}
