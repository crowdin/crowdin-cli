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
        assertNotNull(actions.init(new FsFiles(), null, null, null, null, null, null, null, null, false));
    }

    @Test
    public void testListBranches() {
        assertNotNull(actions.listBranches(false, false));
    }

    @Test
    public void testListProject() {
        assertNotNull(actions.listFiles(false, null, false, false, false));
    }

    @Test
    public void testListSources() {
        assertNotNull(actions.listSources(false, null, false, false, false));
    }

    @Test
    public void testListTranslations() {
        assertNotNull(actions.listTranslations(false, false, false, false, false, false, false));
    }

    @Test
    public void testStatus() {
        assertNotNull(actions.status(false, null, null, null, null, false, false, false, false, false));
    }

    @Test
    public void testStringAdd() {
        assertNotNull(actions.stringAdd(false, null, null, null, null, null, null, null, null, null, null, null, null, null, false));
    }

    @Test
    public void testStringDelete() {
        assertNotNull(actions.stringDelete(null));
    }

    @Test
    public void testStringEdit() {
        assertNotNull(actions.stringEdit(false, false, null, null, null, null, null, null, null, false));
    }

    @Test
    public void testStringList() {
        assertNotNull(actions.stringList(false, false, null, null, null, null, null, null, null, false));
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
        assertNotNull(actions.glossaryUpload(new File("nowhere.txt"), null, null, null, null, false));
    }

    @Test
    public void testGlossaryDownload() {
        assertNotNull(actions.glossaryDownload(null, null, false, null, null));
    }

    @Test
    public void testTmList() {
        assertNotNull(actions.tmList(false));
    }

    @Test
    public void testTmUpload() {
        assertNotNull(actions.tmUpload(null, null, null, null, null, false));
    }

    @Test
    public void testTmDownload() {
        assertNotNull(actions.tmDownload(null, null, null, null, false, null, null));
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
        assertNotNull(actions.distributionRelease(false,true,null, null));
    }

    @Test
    public void testCheckNewVersion() {
        assertNotNull(actions.checkNewVersion());
    }

    @Test
    void testPreTranslate() {
        assertNotNull(actions.preTranslate(null, null, null, null, null, null, null, null, null, null,false, false, null, null));
    }

    @Test
    void testScreenshotList() {
        assertNotNull(actions.screenshotList(null, false));
    }

    @Test
    void testScreenshotUpload() {
        assertNotNull(actions.screenshotUpload(null, null, null, null, null, false, false, false, null));
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

    @Test
    void testFileUpload() {
        assertNotNull(actions.fileUpload(null, null, false, null, null, null, null, null, null, false, true, false));
    }

    @Test
    void testFileUploadTranslation() {
        assertNotNull(actions.fileUploadTranslation(null, null, null, null,false));
    }

    @Test
    void testFileDownload() {
        assertNotNull(actions.fileDownload(null, null, false, null));
    }

    @Test
    void testFileDownloadTranslation() {
        assertNotNull(actions.fileDownloadTranslation(null, null,null, false, null));
    }

    @Test
    void testFileDelete() {
        assertNotNull(actions.fileDelete(null, null));
    }

    @Test
    void testBranchClone() {
        assertNotNull(actions.branchClone(null, null, false, false));
    }

    @Test
    void testProjectAdd() {
        assertNotNull(actions.projectAdd(null, false, null, null, false, false));
    }

    @Test
    void testBundleBrowse() {
        assertNotNull(actions.bundleBrowse(null));
    }
}
