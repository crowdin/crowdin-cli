package com.crowdin.cli;

import com.crowdin.cli.commands.functionality.PropertiesBuilderTest;
import com.crowdin.cli.properties.helper.TempProject;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;

public class WorkWithProjectTestPart {

    protected TempProject tempProject;

    @BeforeEach
    public void initFolder() {
        tempProject = new TempProject(PropertiesBuilderTest.class);
    }

    @AfterEach
    public void removeFolder() {
        tempProject.delete();
    }
}
