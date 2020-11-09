package com.crowdin.cli.properties;

import java.util.Map;

interface PropertiesConfigurator<P extends Properties> {

    void populateWithValues(P props, Map<String, Object> map);

    void populateWithDefaultValues(P props);

    PropertiesBuilder.Messages checkProperties(P props, CheckType checkType);

    enum CheckType {
        STANDARD,
        LINT;
    }
}