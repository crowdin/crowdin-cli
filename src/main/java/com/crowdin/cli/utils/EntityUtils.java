package com.crowdin.cli.utils;


import com.crowdin.common.request.PatchOperation;
import com.crowdin.util.ObjectMapperUtil;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.github.fge.jsonpatch.diff.JsonDiff;

import java.io.IOException;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;
import java.util.function.Predicate;

public class EntityUtils {

    public static <T> Optional<T> find(Collection<T> entities, Predicate<T> predicate) {
        return entities.stream()
                .filter(predicate)
                .findFirst();
    }

    public static <T, R> Optional<T> find(
            Collection<T> entities,
            R conditionValue,
            R conditionValue1,
            Function<T, R> extractor,
            Function<T, R> extractor1) {
        return entities.stream()
                .filter(entity -> extractor.apply(entity).equals(conditionValue))
                .filter(entity -> extractor1.apply(entity).equals(conditionValue1))
                .findFirst();
    }

    public static List<PatchOperation> getPatchOperationForEntities(Object source, Object target) {
        try {
            JsonNode jsonNode = JsonDiff
                    .asJson(
                            ObjectMapperUtil.MAPPER
                                    .readTree(
                                            ObjectMapperUtil.getEntityAsString(source)),
                            ObjectMapperUtil.MAPPER
                                    .readTree(
                                            ObjectMapperUtil.getEntityAsString(target)));


            return ObjectMapperUtil.mapJsonToJavaObject(jsonNode.toString(), new TypeReference<List<PatchOperation>>() {
            });
        } catch (IOException e) {
            System.out.println("Can`t get patch operation for objects: source - " + source + " , target - " + target);
            System.out.println("Error: " + e.getMessage());
        }

        return Collections.emptyList();
    }
}
