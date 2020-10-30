package com.crowdin.cli.properties;

import java.util.Collections;
import java.util.List;
import java.util.Map;

interface BeanConfigurator<B> {

    B buildFromMap(Map<String, Object> map);

    default void populateWithDefaultValues(B bean) {
//        do nothing
    }

    default List<String> checkProperties(B bean) {
        return Collections.emptyList();
    }
}
