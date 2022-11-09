package com.crowdin.cli.properties;

import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.PropertiesBuilderTest;
import com.crowdin.cli.properties.helper.TempProject;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;


class PropertiesWithTargetsBuilderTest {

    private TempProject tempProject;
    private final Outputter out = Outputter.getDefault();
    private PropertiesWithTargetsBuilder propertiesWithTargetsBuilder = new PropertiesWithTargetsBuilder(out);

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
        assertThrows(NullPointerException.class, () -> propertiesWithTargetsBuilder.populateWithIdentityFileParams(any(), any()));
    }

    @Test
    public void everythingEmpty_populateWithConfigFileParams() {
        assertThrows(NullPointerException.class, () -> propertiesWithTargetsBuilder.populateWithConfigFileParams(any(), any()));
    }

    @Test
    public void everythingEmpty_checkArgParams() {
        assertThrows(NullPointerException.class, () -> propertiesWithTargetsBuilder.checkArgParams(any()));
    }

    @Test
    public void everythingEmpty_populateWithArgParams() {
        assertThrows(NullPointerException.class, () -> propertiesWithTargetsBuilder.populateWithArgParams(any(), any()));
    }
}
