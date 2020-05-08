package com.crowdin.cli.properties;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class PropertiesBeanTest {

    @Test
    public void dumbTests() {
        PropertiesBean pb1 = PropertiesBeanBuilder.minimalBuiltPropertiesBean().build();
        PropertiesBean pb2 = PropertiesBeanBuilder.minimalBuiltPropertiesBean().build();
        assertEquals(pb1.toString(), pb2.toString());
        assertEquals(pb2.hashCode(), pb2.hashCode());
    }
}
