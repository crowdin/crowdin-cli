package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.properties.Params;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.properties.PropertiesBeanBuilder;
import com.crowdin.cli.properties.helper.TempProject;
import com.crowdin.cli.utils.Utils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.nio.file.Paths;

import static org.hamcrest.CoreMatchers.is;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

public class PropertiesBuilderTest {

    private TempProject tempProject;

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
        assertThrows(NullPointerException.class, () -> new PropertiesBuilder(null, null, null, null));
    }

    @Test
    public void testOk_MinimalConfigFile() {
        File configFile = new File("crowdin.yml");
        String minimalConfigFileText = PropertiesBeanBuilder
            .minimalPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(tempProject.getBasePath()).buildToString();
        PropertiesBean minimalBuiltConfigFile = PropertiesBeanBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(tempProject.getBasePath()).build();
        configFile = tempProject.addFile(configFile.getPath(), minimalConfigFileText);

        PropertiesBuilder propBuilder = new PropertiesBuilder(Paths.get(tempProject.getBasePath()), configFile, null, null);
        PropertiesBean builtPb = propBuilder.build();

        assertThat("PropertiesBeans are not identical", builtPb, is(minimalBuiltConfigFile));
    }

    @Test
    public void testOk_Params_WithoutConfigFile() {
        Params okParams = new Params() {{
                setIdParam("666");
                setTokenParam("123abc456");
                setSourceParam(Utils.regexPath(Utils.normalizePath("/hello/world")));
                setTranslationParam("/hello/%two_letters_code%/%file_name%.%file_extension%");
            }};

        PropertiesBuilder propBuilder = new PropertiesBuilder(Paths.get(tempProject.getBasePath()), new File("/crowdin.yml"), null, okParams);
        PropertiesBean pb = propBuilder.build();

        assertEquals(pb.getPreserveHierarchy(), false);
        assertEquals(pb.getFiles().size(), 1);
        assertEquals(pb.getFiles().get(0).getSource(), "hello" + Utils.PATH_SEPARATOR + "world");
    }

    @Test
    public void testOk_Params_WithConfigFile() {
        File configFile = new File("crowdin.yml");
        String minimalConfigFileText = PropertiesBeanBuilder
            .minimalPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(tempProject.getBasePath()).buildToString();
        PropertiesBean minimalBuiltConfigFile = PropertiesBeanBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "CR-%locale%")
            .setBasePath(tempProject.getBasePath()).build();
        configFile = tempProject.addFile(configFile.getPath(), minimalConfigFileText);

        Params okParams = new Params() {{
                setIdParam("666");
                setTokenParam("123abc456");
                setSourceParam(Utils.regexPath(Utils.normalizePath("/hello/world")));
                setTranslationParam("/hello/%two_letters_code%/%file_name%.%file_extension%");
            }};

        PropertiesBuilder propBuilder = new PropertiesBuilder(Paths.get(tempProject.getBasePath()), configFile, null, okParams);
        PropertiesBean pb = propBuilder.build();

        assertEquals(pb.getPreserveHierarchy(), false);
        assertEquals(pb.getFiles().size(), 1);
        assertEquals(pb.getFiles().get(0).getSource(), "hello" + Utils.PATH_SEPARATOR + "world");
    }

    @Test
    public void testOkBasePath_Params_WithConfigFile() {
        File configFile = new File("folder/crowdin.yml");
        String minimalConfigFileText = PropertiesBeanBuilder
            .minimalPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(tempProject.getBasePath()).buildToString();
        PropertiesBean minimalBuiltConfigFile = PropertiesBeanBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "CR-%locale%")
            .setBasePath(tempProject.getBasePath()).build();
        configFile = tempProject.addFile(configFile.getPath(), minimalConfigFileText);

        Params okParams = new Params() {{
                setBasePathParam(tempProject.getBasePath() + "folder2/");
            }};
        tempProject.addDirectory("folder2/");

        PropertiesBuilder propBuilder = new PropertiesBuilder(Paths.get(tempProject.getBasePath()), configFile, null, okParams);
        assertDoesNotThrow(propBuilder::build);
        PropertiesBean pb = propBuilder.build();

        assertEquals(pb.getBasePath(), tempProject.getBasePath() + "folder2" + Utils.PATH_SEPARATOR);
    }

    @Test
    public void testOk_MinimalConfigFile_withIdentityFile() {
        File configFile = new File("crowdin.yml");
        String identityFileData = "\"api_token_env\": \"API_TOKEN\"\n\"base_path\": \".\"\n\"base_url\": \"https://crowdin.com\"\n\"project_id\": 42";
        File identityFile = tempProject.addFile("identity.yaml", identityFileData);
        String minimalConfigFileText = PropertiesBeanBuilder
            .minimalPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(tempProject.getBasePath()).buildToString();
        PropertiesBean minimalBuiltConfigFile = PropertiesBeanBuilder
            .minimalBuiltPropertiesBean("*", Utils.PATH_SEPARATOR + "%original_file_name%-CR-%locale%")
            .setBasePath(tempProject.getBasePath()).build();
        configFile = tempProject.addFile(configFile.getPath(), minimalConfigFileText);

        PropertiesBuilder propBuilder = new PropertiesBuilder(Paths.get(tempProject.getBasePath()), configFile, identityFile, null);
        PropertiesBean builtPb = propBuilder.build();

        minimalBuiltConfigFile.setProjectId("42");

        assertThat("PropertiesBeans are not identical", builtPb, is(minimalBuiltConfigFile));
    }
}
