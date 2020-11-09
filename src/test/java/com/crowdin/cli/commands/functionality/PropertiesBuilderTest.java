package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.ParamsWithFiles;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.PropertiesBuilders;
import com.crowdin.cli.properties.helper.TempProject;
import com.crowdin.cli.utils.Utils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.File;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

public class PropertiesBuilderTest {

    private TempProject tempProject;

    private PropertiesBuilders propertiesBuilders = new PropertiesBuilders();
    private Outputter out = Outputter.getDefault();

    @BeforeEach
    private void initFolder() {
        tempProject = new TempProject(PropertiesBuilderTest.class);
    }

    @AfterEach
    private void removeFolder() {
        tempProject.delete();
    }

    @Test
    public void testError_EverythingEmpty() {
        assertThrows(NullPointerException.class, () -> propertiesBuilders.buildPropertiesWithFiles(out, null, null, null));
    }

    @Test
    public void testOk_Params_WithoutConfigFile() {
        ParamsWithFiles okParams = new ParamsWithFiles() {{
                setIdParam("666");
                setTokenParam("123abc456");
                setSourceParam(Utils.regexPath(Utils.normalizePath("/hello/world")));
                setTranslationParam("/hello/%two_letters_code%/%file_name%.%file_extension%");
            }};

        PropertiesWithFiles pb = propertiesBuilders.buildPropertiesWithFiles(out, new File("crowdin.yml"), null, okParams);

        assertEquals(pb.getPreserveHierarchy(), false);
        assertEquals(pb.getFiles().size(), 1);
        assertEquals(pb.getFiles().get(0).getSource(), "hello" + Utils.PATH_SEPARATOR + "world");
    }

    @Test
    public void testOk_Params_WithConfigFile() {
        File configFile = new File("crowdin.yml");
        String minimalConfigFileText = NewPropertiesWithFilesUtilBuilder
            .minimalPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(tempProject.getBasePath()).buildToString();
        configFile = tempProject.addFile(configFile.getPath(), minimalConfigFileText);

        ParamsWithFiles okParams = new ParamsWithFiles() {{
                setIdParam("666");
                setTokenParam("123abc456");
                setSourceParam(Utils.regexPath(Utils.normalizePath("/hello/world")));
                setTranslationParam("/hello/%two_letters_code%/%file_name%.%file_extension%");
            }};

        PropertiesWithFiles pb = propertiesBuilders.buildPropertiesWithFiles(out, configFile, null, okParams);

        assertEquals(pb.getPreserveHierarchy(), false);
        assertEquals(pb.getFiles().size(), 1);
        assertEquals(pb.getFiles().get(0).getSource(), "hello" + Utils.PATH_SEPARATOR + "world");
    }

    @Test
    public void testOkBasePath_Params_WithConfigFile() {
        File configFile = new File("folder/crowdin.yml");
        String minimalConfigFileText = NewPropertiesWithFilesUtilBuilder
            .minimalPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(tempProject.getBasePath()).buildToString();
        configFile = tempProject.addFile(configFile.getPath(), minimalConfigFileText);

        ParamsWithFiles okParams = new ParamsWithFiles() {{
                setBasePathParam(tempProject.getBasePath() + "folder2/");
            }};
        tempProject.addDirectory("folder2/");

        System.out.println("configFile = " + configFile);
        System.out.println("okParams = " + okParams.getBasePathParam());
        PropertiesWithFiles pb = propertiesBuilders.buildPropertiesWithFiles(out, configFile, null, okParams);

        assertEquals(tempProject.getBasePath() + "folder2" + Utils.PATH_SEPARATOR, pb.getBasePath());
    }
}
