package com.crowdin.cli.properties;

import com.crowdin.cli.commands.Outputter;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

public class PropertiesWithFilesTest {

    private final Outputter out = Outputter.getDefault();

    NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder.minimalBuiltPropertiesBean();

    @Test
    public void rightParams_populateWithPreserveHierarchyArg() {
        ParamsWithFiles params = new ParamsWithFiles();
        params.setPreserveHierarchy(true);
        PropertiesWithFiles props = pbBuilder.build();

        new PropertiesWithFilesBuilder(out).populateWithArgParams(props, params);
        assertEquals(params.getPreserveHierarchy(), props.getPreserveHierarchy());
    }

    @Test
    public void testPopulateWithArgParams_NoPreserveHierarchy() {
        ParamsWithFiles params = new ParamsWithFiles();
        PropertiesWithFiles props = pbBuilder.build();

        new PropertiesWithFilesBuilder(out).populateWithArgParams(props, params);
        assertFalse(props.getPreserveHierarchy());
    }
}
