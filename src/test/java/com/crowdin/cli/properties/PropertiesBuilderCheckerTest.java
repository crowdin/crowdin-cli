package com.crowdin.cli.properties;

import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.PropertiesBuilderTest;
import com.crowdin.cli.properties.helper.TempProject;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;


class PropertiesBuilderCheckerTest {
    private TempProject tempProject;
    private final Outputter out = Outputter.getDefault();
    private final PropertiesBuilderChecker propertiesBuilderChecker = new PropertiesBuilderChecker(out);

    @BeforeEach
    public void initFolder() {
        tempProject = new TempProject(PropertiesBuilderTest.class);
    }

    @AfterEach
    public void removeFolder() {
        tempProject.delete();
    }

    @Test
    public void everythingEmpty_populateWithIdentityFileParams() {
        assertThrows(NullPointerException.class, () -> propertiesBuilderChecker.populateWithIdentityFileParams(any(), any()));
    }

    @Test
    public void rightParams_populateWithIdentityFileParams() {
        AllProperties allProperties = new AllProperties();

        HashMap fileMap = new HashMap();
        ArrayList fileList = new ArrayList();
        fileMap.put("source","internet");
        fileMap.put("dest","computer");
        fileList.add(fileMap);

        Map <String, Object> map = new HashMap<String, Object>();
        map.put("project_id","123");
        map.put("preserve_hierarchy", true);
        map.put("files", fileList);
        map.put("pseudoLocalization","123");

        new PropertiesBuilderChecker(out).populateWithIdentityFileParams(allProperties, map);

        assertEquals(allProperties.getProjectProperties().getProjectId(), "123");
    }

    @Test
    public void everythingEmpty_populateWithConfigFileParams() {
        assertThrows(NullPointerException.class, () -> propertiesBuilderChecker.populateWithConfigFileParams(any(), any()));
    }

    @Test
    public void rightParams_populateWithConfigFileParams() {
        AllProperties allProperties = new AllProperties();

        HashMap fileMap = new HashMap();
        ArrayList fileList = new ArrayList();
        fileMap.put("source","internet");
        fileMap.put("dest","computer");
        fileList.add(fileMap);

        Map <String, Object> map = new HashMap<String, Object>();
        map.put("project_id","123");
        map.put("preserve_hierarchy", true);
        map.put("files", fileList);
        map.put("pseudoLocalization","123");

        new PropertiesBuilderChecker(out).populateWithConfigFileParams(allProperties, map);

        assertEquals(allProperties.getProjectProperties().getProjectId(), "123");
        assertEquals(allProperties.getPropertiesWithFiles().getFiles().get(0).getSource(), "internet");
        assertEquals(allProperties.getPropertiesWithFiles().getFiles().get(0).getDest(), "computer");
    }

    @Test
    public void everythingEmpty_checkArgParams() {
        assertThrows(NullPointerException.class, () -> propertiesBuilderChecker.checkArgParams(any()));
    }

    @Test
    public void everythingEmpty_populateWithArgParams() {
        assertThrows(NullPointerException.class, () -> propertiesBuilderChecker.populateWithArgParams(any(), any()));
    }
}

