package com.crowdin.cli.commands.actions;

import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.functionality.FsFiles;
import org.junit.jupiter.api.Test;

import java.io.File;

import static org.junit.jupiter.api.Assertions.assertNotNull;

public class CliActionsTest {

    private Actions actions = new CliActions();

    @Test
    public void testDownload() {
        assertNotNull(actions.download(new FsFiles(), false, null, null, false, null, false, false, false, false, false));
    }

    @Test
    public void testGenerate() {
        assertNotNull(actions.generate(new FsFiles(), null, false));
    }

    @Test
    public void testListBranches() {
        assertNotNull(actions.listBranches(false, false));
    }

    @Test
    public void testListProject() {
        assertNotNull(actions.listProject(false, null, false, false));
    }

    @Test
    public void testListSources() {
        assertNotNull(actions.listSources(false, null, false, false, false));
    }

    @Test
    public void testListTranslations() {
        assertNotNull(actions.listTranslations(false, false, false, false, false, false));
    }

    @Test
    public void testStatus() {
        assertNotNull(actions.status(false, null, null, null, null, false, false, false, false));
    }

    @Test
    public void testStringAdd() {
        assertNotNull(actions.stringAdd(false, null, null, null, null, null, null, null));
    }

    @Test
    public void testStringDelete() {
        assertNotNull(actions.stringDelete(false, null, null, null));
    }

    @Test
    public void testStringEdit() {
        assertNotNull(actions.stringEdit(false, null, null, null, null, null, null, null));
    }

    @Test
    public void testStringList() {
        assertNotNull(actions.stringList(false, false, null, null, null, null));
    }

    @Test
    public void testUploadSources() {
        assertNotNull(actions.uploadSources(null, false, false, false, false, false));
    }

    @Test
    public void testUploadTranslations() {
        assertNotNull(actions.uploadTranslations(false, null, null, false, false, false, false, false));
    }

    @Test
    public void testGlossaryList() {
        assertNotNull(actions.glossaryList(false, false));
    }

    @Test
    public void testGlossaryUpload() {
        assertNotNull(actions.glossaryUpload(new File("nowhere.txt"), null, null, null, null, null));
    }

    @Test
    public void testGlossaryDownload() {
        assertNotNull(actions.glossaryDownload(null, null, null, false, null, null));
    }

    @Test
    public void testTmList() {
        assertNotNull(actions.tmList(false));
    }

    @Test
    public void testTmUpload() {
        assertNotNull(actions.tmUpload(null, null, null, null, null, null));
    }

    @Test
    public void testTmDownload() {
        assertNotNull(actions.tmDownload(null, null, null, null, null, false, null, null));
    }

    @Test
    public void testDistributionAdd() {
        assertNotNull(actions.distributionAdd(false, false, null, null, null, null, null, null));
    }

    @Test
    public void testDistributionList() {
        assertNotNull(actions.distributionList(true));
    }

    @Test
    public void testDistributionRelease() {
        assertNotNull(actions.distributionRelease(false,true,null));
    }

    @Test
    public void testCheckNewVersion() {
        assertNotNull(actions.checkNewVersion());
    }

    @Test
    void testScreenshotList() {
        assertNotNull(actions.screenshotList(null, false));
    }

    @Test
    void testScreenshotUpload() {
        assertNotNull(actions.screenshotUpload(null, null, null, null, false, false, false, null));
    }

    @Test
    void testScreenshotDelete() {
        assertNotNull(actions.screenshotDelete(null));
    }

    @Test
    void testLabelList() {
        assertNotNull(actions.labelList(false, true));
    }

    @Test
    void testLabelAdd() {
        assertNotNull(actions.labelAdd(null, false));
    }

    @Test
    void testLabelDelete() {
        assertNotNull(actions.labelDelete(null));
    }
}
