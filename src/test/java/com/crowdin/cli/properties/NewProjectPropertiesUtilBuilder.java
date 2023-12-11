package com.crowdin.cli.properties;

import static com.crowdin.cli.properties.NewBasePropertiesUtilBuilder.TEST_API_TOKEN;
import static com.crowdin.cli.properties.NewBasePropertiesUtilBuilder.TEST_BASE_PATH;
import static com.crowdin.cli.properties.NewBasePropertiesUtilBuilder.TEST_BASE_URL;

public class NewProjectPropertiesUtilBuilder {

    public static final String TEST_PROJECT_ID = "666";

    private ProjectProperties pb;

    public static NewProjectPropertiesUtilBuilder minimalBuilt() {
        return minimalBuilt(TEST_PROJECT_ID);
    }

    public static NewProjectPropertiesUtilBuilder minimalBuilt(String projectId) {
        ProjectProperties pb = new ProjectProperties();
        pb.setApiToken(TEST_API_TOKEN);
        pb.setBaseUrl(TEST_BASE_URL);
        pb.setBasePath(TEST_BASE_PATH);
        pb.setProjectId(projectId);
        NewProjectPropertiesUtilBuilder builder = new NewProjectPropertiesUtilBuilder();
        builder.pb = pb;
        return builder;
    }

    public ProjectProperties build() {
        return pb;
    }
}
