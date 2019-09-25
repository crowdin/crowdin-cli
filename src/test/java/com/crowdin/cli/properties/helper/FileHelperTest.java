package com.crowdin.cli.properties.helper;

import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.PropertiesBean;
import org.junit.After;
import org.junit.Before;
import org.junit.Ignore;
import org.junit.Test;

import java.io.File;
import java.io.IOException;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.Collections;
import java.util.LinkedList;
import java.util.List;

import static org.junit.Assert.assertEquals;

/**
 * Created by daniel on 10/7/17.
 */
public class FileHelperTest {

    private Path projectDir;
    private FileBean fileBean;
    private PropertiesBean propertiesBean;

    @Before
    public void setUp() throws Exception {
        // Mocking up a fake project.
        //XXX: Currently creates no files, because the only test does no I/O.
        projectDir = Files.createTempDirectory("FileHelperTest.");

        mockFile("module/src/main/java/com/acme/module/Source.java");
        mockFile("module/src/main/resources/com/acme/module/Bundle.properties");
        mockFile("module/src/main/resources/com/acme/module/Bundle_ar.properties");
        mockFile("module/build/main/java/com/acme/module/Source.class");
        mockFile("module/build/main/resources/com/acme/module/Bundle.properties");
        mockFile("module/build/main/resources/com/acme/module/Bundle_ar.properties");

        propertiesBean = new PropertiesBean();

        fileBean = new FileBean();
        fileBean.setSource("**/*.properties");
        List<String> ignorePatterns = new LinkedList<>();
        ignorePatterns.add("**/*_*.properties");
        ignorePatterns.add("**/build/**/*");
        fileBean.setIgnore(ignorePatterns);
    }

    private void mockFile(String path) throws Exception {
        Path file = projectDir.resolve(path);
        Files.createDirectories(file.getParent());
        Files.createFile(file);
    }

    @After
    public void tearDown() throws Exception {
        //XXX: Would delete temp here if we had created it.
        insecureRecursiveDelete(projectDir);
    }

    private void insecureRecursiveDelete(Path dir) throws Exception {
        Files.walkFileTree(dir, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                Files.delete(file);
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult postVisitDirectory(Path dir, IOException exc) throws IOException {
                Files.delete(dir);
                return FileVisitResult.CONTINUE;
            }
        });
    }

    @Test
    @Ignore
    public void testGetFileSource() {
        List<File> results = new FileHelper().getFileSource(fileBean, propertiesBean);

        List<File> expectedResults = new LinkedList<>();
        expectedResults.add(projectDir.resolve("module/build/main/resources/com/acme/module/Bundle.properties").toFile());
        expectedResults.add(projectDir.resolve("module/build/main/resources/com/acme/module/Bundle_ar.properties").toFile());
        expectedResults.add(projectDir.resolve("module/src/main/resources/com/acme/module/Bundle.properties").toFile());
        expectedResults.add(projectDir.resolve("module/src/main/resources/com/acme/module/Bundle_ar.properties").toFile());
        Collections.sort(results);
        assertEquals(expectedResults, results);
    }

    @Test
    public void testGetFileSourceWithoutIgnores() {
        List<File> sources = new LinkedList<>();
        sources.add(projectDir.resolve("module/src/main/resources/com/acme/module/Bundle.properties").toFile());
        sources.add(projectDir.resolve("module/src/main/resources/com/acme/module/Bundle_ar.properties").toFile());
        sources.add(projectDir.resolve("module/build/main/resources/com/acme/module/Bundle.properties").toFile());
        sources.add(projectDir.resolve("module/build/main/resources/com/acme/module/Bundle_ar.properties").toFile());

        List<File> results = new FileHelper().filterOutIgnoredFiles(sources, fileBean, propertiesBean);

        List<File> expectedResults = new LinkedList<>();
        expectedResults.add(projectDir.resolve("module/src/main/resources/com/acme/module/Bundle.properties").toFile());
        assertEquals(expectedResults, results);
    }
}
