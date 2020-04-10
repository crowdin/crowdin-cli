package com.crowdin.cli.utils.file;

import com.crowdin.cli.WorkWithProjectTestPart;
import com.crowdin.cli.utils.Utils;
import org.apache.commons.io.IOUtils;
import org.junit.jupiter.api.Test;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.*;

public class FileUtilsTest extends WorkWithProjectTestPart {

    @Test
    public void testReadYamlFile_FileNotExist() {
        File notExistentFile = new File(tempProject.getBasePath() + "not_existent.yml");
        assertThrows(RuntimeException.class, () -> FileUtils.readYamlFile(notExistentFile));
    }

    @Test
    public void testWriteToFile_1() throws IOException {
        String text = "Text42";
        InputStream inputStream = IOUtils.toInputStream(text, "UTF-8");
        File file = new File(tempProject.getBasePath() + "not_existent.txt");
        assertFalse(file.exists());
        assertDoesNotThrow(() -> FileUtils.writeToFile(inputStream, file.getAbsolutePath()));
        assertTrue(file.exists());
        String result = org.apache.commons.io.FileUtils.readFileToString(file, "UTF-8");
        assertEquals(text, result);
    }

    @Test
    public void testWriteToFile_2() throws IOException {
        String text = "Text42";
        InputStream inputStream = IOUtils.toInputStream(text, "UTF-8");
        File file = new File(tempProject.getBasePath() + "directory" + Utils.PATH_SEPARATOR + "not_existent.txt");
        assertFalse(file.exists());
        assertDoesNotThrow(() -> FileUtils.writeToFile(inputStream, file.getAbsolutePath()));
        assertTrue(file.exists());
        String result = org.apache.commons.io.FileUtils.readFileToString(file, "UTF-8");
        assertEquals(text, result);
    }
}
