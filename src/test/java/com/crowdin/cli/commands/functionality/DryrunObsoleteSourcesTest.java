package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.client.CrowdinProjectFull;
import com.crowdin.cli.client.ProjectBuilder;
import com.crowdin.cli.properties.NewPropertiesWithFilesUtilBuilder;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.properties.helper.FileHelperTest;
import com.crowdin.cli.properties.helper.TempProject;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.PlaceholderUtilBuilder;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.sourcefiles.model.Directory;
import com.crowdin.client.sourcefiles.model.File;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.*;

public class DryrunObsoleteSourcesTest {

    private TempProject project;

    @BeforeEach
    public void createProj() {
        project = new TempProject(FileHelperTest.class);
    }

    @AfterEach
    public void deleteProj() {
        project.delete();
    }

    @Test
    public void testGetFilesWithNoObsoleteFiles() {
        project.addFile(Utils.normalizePath("docs/en/index.md"), "Hello, World!");
        String translationPattern = "/app/docs/%two_letters_code%/%original_file_name%";
        NewPropertiesWithFilesUtilBuilder pbBuilder = NewPropertiesWithFilesUtilBuilder
                .minimalBuiltPropertiesBean(Utils.normalizePath("/docs/en/index.md"), translationPattern, Arrays.asList("**/.*"))
                .setBasePath(project.getBasePath());
        PropertiesWithFiles pb = pbBuilder.build();
        pb.getFiles().get(0).setDest("/app/%original_path%/%original_file_name%");
        pb.setPreserveHierarchy(true);
        pb.setProjectId("551261");

        PlaceholderUtil placeholderUtil = PlaceholderUtilBuilder.STANDART.build(project.getBasePath());

        CrowdinProjectFull proj = ProjectBuilder.emptyProject(Long.parseLong(pb.getProjectId()))
                .addFile("locale.yml", "yaml", 66l, 209l, null, translationPattern)
                .addFile("index.md", "yaml", 77l, 209l, null, translationPattern)
                .addDirectory("docs", 207l, 215l, null)
                .addDirectory("app", 215l, null, null)
                .addDirectory("en", 209l, 207l, null)
                .addDirectory("en", 225l, null, null)
                .build();

        Map<Long, Directory> directories = proj.getDirectories();
        List<File> files = proj.getFiles();

        DryrunObsoleteSources dryrun = new DryrunObsoleteSources(pb, placeholderUtil, directories, files);

        List<String> obsoleteFilesResult = dryrun.getFiles();

        assertTrue(obsoleteFilesResult.isEmpty());
    }

}
