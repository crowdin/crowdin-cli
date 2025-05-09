package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.*;
import com.crowdin.cli.properties.helper.TempProject;
import com.crowdin.cli.utils.Utils;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.File;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class PropertiesBuilderTest {

    private TempProject tempProject;

    private PropertiesBuilders propertiesBuilders = new PropertiesBuilders(false, false);
    private Outputter out = Outputter.getDefault();

    @BeforeEach
    public void initFolder() {
        tempProject = new TempProject(PropertiesBuilderTest.class);
    }

    @AfterEach
    public void removeFolder() {
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
        assertEquals(pb.getFiles().get(0).getSource(), Utils.PATH_SEPARATOR + "hello" + Utils.PATH_SEPARATOR + "world");
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
        assertEquals(pb.getFiles().get(0).getSource(), Utils.PATH_SEPARATOR + "hello" + Utils.PATH_SEPARATOR + "world");
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

    @Test
    public void testBuildNoProperties() {
        PropertiesBuilders pb = mock(PropertiesBuilders.class);
        NoProperties np = mock(NoProperties.class);
        when(pb.buildNoProperties()).thenReturn(np);
    }

    @Test
    public void testBuildBaseProperties() {
        SettingsBean set = new SettingsBean();
        BaseProperties bp = new BaseProperties();
        String bpath = ".";
        String url = "https://crowdin.com";
        String api = "123abc456";
        bp.setBasePath(bpath);
        bp.setBaseUrl(url);
        bp.setApiToken(api);
        bp.setSettings(set);

        assertEquals(bp.getBasePath(), ".");
        assertEquals(bp.getBaseUrl(), "https://crowdin.com");
        assertEquals(bp.getApiToken(), "123abc456");
        assertEquals(bp.getSettings(), set);
    }

    @Test
    public void testBasePropertiesWithNoValues() {
        BaseProperties bp = new BaseProperties();
        String bpath = "";
        String url = "";
        String api = "";
        bp.setBasePath(bpath);
        bp.setBaseUrl(url);
        bp.setApiToken(api);

        assertEquals(bp.getBasePath(), "");
        assertEquals(bp.getBaseUrl(), "");
        assertEquals(bp.getApiToken(), "");
    }

    @Test
    public void testProjectProperties() {
        ProjectParams params = new ProjectParams(){{
            setIdParam("123");
            setTokenParam("token");
        }};

        ProjectProperties pp = propertiesBuilders.buildProjectProperties(out, null, null, params);
        String projectId = "123";
        pp.setProjectId(projectId);

        assertEquals(pp.getProjectId(), params.getIdParam());
        assertEquals(pp.getApiToken(), params.getTokenParam());
    }

    @Test
    public void testBuildNoConfigFileAndNoToken() {
        ParamsWithFiles params = new ParamsWithFiles() {{
            setBasePathParam(null);
            setTokenParam(null);
            setSourceParam(Utils.regexPath(Utils.normalizePath("/hello/world")));
            setTranslationParam("/hello/%two_letters_code%/%file_name%.%file_extension%");
        }};

        Exception actualException = assertThrows(RuntimeException.class, () ->
                propertiesBuilders.buildPropertiesWithFiles(out, null, null, params));

        assertEquals(RESOURCE_BUNDLE.getString("error.configuration_file_not_exist"), actualException.getMessage());

    }

    @Test
    public void testNoTranslationLangPlaceholder() {
        ParamsWithFiles params = new ParamsWithFiles() {{
            setIdParam("666");
            setTokenParam("123abc456");
            setSourceParam(Utils.regexPath(Utils.normalizePath("/Localizable.xcstrings")));
            setTranslationParam("Localizable.xcstrings");
        }};

        Exception actualException = assertThrows(RuntimeException.class, () ->
            propertiesBuilders.buildPropertiesWithFiles(out, null, null, params));

        assertTrue(actualException.getMessage().contains(RESOURCE_BUNDLE.getString("error.config.translation_has_no_language_placeholders")));
    }

    @Test
    public void testMockBasePropUrl() {
        BaseProperties bp = mock(BaseProperties.class);
        bp.setBaseUrl("https://crowdin.com");
        String url = "https://crowdin.com";
        when(bp.getBaseUrl()).thenReturn(url);
    }

    @Test
    public void testMockBasePropPath() {
        BaseProperties bp = mock(BaseProperties.class);
        bp.setBasePath("./path");
        String path = "./path";
        when(bp.getBasePath()).thenReturn(path);
    }

    @Test
    public void testMockBasePropApiToken() {
        BaseProperties bp = mock(BaseProperties.class);
        bp.setApiToken("123Token");
        String token = "123Token";
        when(bp.getApiToken()).thenReturn(token);
    }

    @Test
    public void testMockProjectPropToken() {
        ProjectProperties pp = mock(ProjectProperties.class);
        pp.setApiToken("123Token");
        String token = "123Token";
        when(pp.getApiToken()).thenReturn(token);
    }

    @Test
    public void testMockProjectPropPath() {
        ProjectProperties pp = mock(ProjectProperties.class);
        pp.setBasePath("./path");
        String path = "./path";
        when(pp.getBasePath()).thenReturn(path);
    }

    @Test
    public void testMockProjectPropUrl() {
        ProjectProperties pp = mock(ProjectProperties.class);
        pp.setBaseUrl("https://crowdin.com");
        String url = "https://crowdin.com";
        when(pp.getBaseUrl()).thenReturn(url);
    }

}
