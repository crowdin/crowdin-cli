package com.crowdin.cli.properties;

import com.crowdin.cli.properties.helper.FileHelperTest;
import com.crowdin.cli.properties.helper.TempProject;
import com.crowdin.cli.utils.Utils;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.HashMap;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

public class CliPropertiesTest {

    static TempProject project;

    @BeforeAll
    public static void createProj() {
        project = new TempProject(FileHelperTest.class);
        project.addDirectory("existentFolder");
    }

    @AfterAll
    public static void deleteProj() {
        project.delete();
    }

    @Test
    public void testEmptyPB() {
        PropertiesBean pb = new PropertiesBean();
        assertThrows(RuntimeException.class, () -> CliProperties.processProperties(pb, project.getBasePath()));
    }

    @Test
    public void testForNull() {
        assertThrows(RuntimeException.class, () -> CliProperties.processProperties(null, null));
    }

    @Test
    public void testBasePath() {
        PropertiesBean pb = new PropertiesBeanBuilder().minimalPropertiesBean().setBasePath(".").build();
        CliProperties.processProperties(pb, project.getBasePath());
        assertEquals(project.getBasePath(), pb.getBasePath());

        PropertiesBean pb2 = new PropertiesBeanBuilder().minimalPropertiesBean().setBasePath("nonexistentFolder").build();
        assertThrows(RuntimeException.class, () -> CliProperties.processProperties(pb2, project.getBasePath()));

        PropertiesBean pb3 = new PropertiesBeanBuilder().minimalPropertiesBean().setBasePath(null).build();
        CliProperties.processProperties(pb3, project.getBasePath());
        assertEquals(project.getBasePath(), pb3.getBasePath());

        PropertiesBean pb4 = new PropertiesBeanBuilder().minimalPropertiesBean().setBasePath("existentFolder" + Utils.PATH_SEPARATOR).build();
        CliProperties.processProperties(pb4, project.getBasePath());
        assertEquals(project.getBasePath() + "existentFolder" + Utils.PATH_SEPARATOR, pb4.getBasePath());
    }

    @Test
    public void testFileBean() {
        PropertiesBean pbNull = PropertiesBeanBuilder.minimalPropertiesBeanWithoutFileBean().build();
        assertThrows(RuntimeException.class, () -> CliProperties.processProperties(pbNull, project.getBasePath()));

        PropertiesBean pb2NoFields = PropertiesBeanBuilder.minimalPropertiesBeanWithoutFileBean().build();
        pb2NoFields.setFiles(new FileBean());
        assertThrows(RuntimeException.class, () -> CliProperties.processProperties(pb2NoFields, project.getBasePath()));

        PropertiesBean pb3AllFields = PropertiesBeanBuilder
            .minimalPropertiesBean("*", PropertiesBeanBuilder.STANDARD_TRANSLATIONS).build();
        FileBean fb = pb3AllFields.getFiles().get(0);
        fb.setIgnore(Arrays.asList("*-CR-*"));
        fb.setDest("random-thing.po");
        fb.setType("gettext");
        fb.setUpdateOption("update_as_unapproved");
        fb.setTranslateAttributes(true);
        fb.setTranslateContent(true);
        fb.setContentSegmentation(true);
        fb.setEscapeQuotes(2);
        fb.setLanguagesMapping(new HashMap<>());
        fb.setMultilingualSpreadsheet(true);
        fb.setScheme("identifier,source_phrase,context,uk,ru,fr");
        fb.setTranslationReplace(new HashMap<>());
        assertThrows(RuntimeException.class, () -> CliProperties.processProperties(pb3AllFields, project.getBasePath()));
    }
}
