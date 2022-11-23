package com.crowdin.cli.properties;

import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.PropertiesBuilderTest;
import com.crowdin.cli.properties.helper.TempProject;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;


class ProjectPropertiesBuilderTest {
    private TempProject tempProject;
    private final Outputter out = Outputter.getDefault();
    private ProjectPropertiesBuilder projectPropertiesBuilders = new ProjectPropertiesBuilder(out);

    @BeforeEach
    private void initFolder() {
        tempProject = new TempProject(PropertiesBuilderTest.class);
    }

    @AfterEach
    private void removeFolder() {
        tempProject.delete();
    }

    @Test
    public void everythingEmpty_populateWithIdentityFileParams() {
        assertThrows(NullPointerException.class, () -> projectPropertiesBuilders.populateWithIdentityFileParams(any(), any()));
    }

    @Test
    public void rightParams_populateWithIdentityFileParams() {
        ProjectProperties projectProperties = new ProjectProperties();

        Map <String, Object> map = new HashMap<String, Object>();
        map.put("api_token","123");
        map.put("project_id","123");
        map.put("base_url","/crowdin");
        map.put("base_path","/crowdin");

        new ProjectPropertiesBuilder(out).populateWithConfigFileParams(projectProperties, map);

        assertEquals(projectProperties.getProjectId(), "123");
        assertEquals(projectProperties.getApiToken(), "123");
        assertEquals(projectProperties.getBasePath(), "/crowdin");
        assertEquals(projectProperties.getBasePath(), "/crowdin");
    }

    @Test
    public void everythingEmpty_populateWithConfigFileParams() {
        assertThrows(NullPointerException.class, () -> projectPropertiesBuilders.populateWithConfigFileParams(any(), any()));
    }

    @Test
    public void rightParams_populateWithConfigFileParams() {
        ProjectProperties projectProperties = new ProjectProperties();

        Map <String, Object> map = new HashMap<String, Object>();
        map.put("api_token","123");
        map.put("project_id","123");
        map.put("base_url","/crowdin");
        map.put("base_path","/crowdin");

        new ProjectPropertiesBuilder(out).populateWithConfigFileParams(projectProperties, map);

        assertEquals(projectProperties.getProjectId(), "123");
        assertEquals(projectProperties.getApiToken(), "123");
        assertEquals(projectProperties.getBasePath(), "/crowdin");
        assertEquals(projectProperties.getBasePath(), "/crowdin");
    }

    @Test
    public void everythingEmpty_checkArgParams() {
        assertThrows(NullPointerException.class, () -> projectPropertiesBuilders.checkArgParams(any()));
    }

    @Test
    public void rightParams_checkArgParams() {
        ProjectParams pp = new ProjectParams();
        pp.setIdParam("123");
        pp.setTokenParam("123");
        pp.setBasePathParam(tempProject.getBasePath());
        pp.setBaseUrlParam("https://crowdin.com");

        PropertiesBuilder.Messages message =  projectPropertiesBuilders.checkArgParams(pp);
        assertTrue(message.getErrors().isEmpty());
        assertTrue(message.getWarnings().isEmpty());
    }

    @Test
    public void everythingEmpty_populateWithArgParams() {
        assertThrows(NullPointerException.class, () -> projectPropertiesBuilders.populateWithArgParams(any(), any()));
    }

    @Test
    public void rightParams_populateWithArgParams() {
        ProjectProperties projectProperties = new ProjectProperties();

        ProjectParams pp = new ProjectParams();
        pp.setIdParam("123");
        pp.setTokenParam("123");
        pp.setBasePathParam(tempProject.getBasePath());
        pp.setBaseUrlParam("https://crowdin.com");

        new ProjectPropertiesBuilder(out).populateWithArgParams(projectProperties, pp);

        assertEquals(projectProperties.getProjectId(), "123");
        assertEquals(projectProperties.getApiToken(), "123");
        assertEquals(projectProperties.getBasePath(), tempProject.getBasePath());
        assertEquals(projectProperties.getBaseUrl(), "https://crowdin.com");
    }

    @Test
    public void rightParams_populateWithDefaultValues() {
        ProjectProperties projectProperties = new ProjectProperties();
        projectProperties.setApiToken("123");
        projectProperties.setBasePath(tempProject.getBasePath());
        projectProperties.setBaseUrl("https://crowdin.com");

        new ProjectPropertiesBuilder(out).populateWithDefaultValues(projectProperties);

        assertEquals(projectProperties.getApiToken(), "123");
        assertEquals(projectProperties.getBasePath(), tempProject.getBasePath());
        assertEquals(projectProperties.getBaseUrl(), "https://crowdin.com");
    }
}
