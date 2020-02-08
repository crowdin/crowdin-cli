package com.crowdin.cli.integration;

import com.crowdin.cli.integration.Core.BaseIntegrationTest;
import org.junit.jupiter.api.Test;

public class LintCommandTest extends BaseIntegrationTest {

    public LintCommandTest() {
        this.testName = "lintCommandTest";
    }

    @Test
    public void testMissingConfig() {
        this.expectErrorOutput("testMissingConfig.txt");

        this.executeCliCommand("lint");
    }

    @Test
    public void testGoodConfig() {
        this.initConfig("testGoodConfig.yml");
        this.expectOutput("testGoodConfig.txt");

        this.executeCliCommand("lint");
    }

    @Test
    public void testMissingProjectId() {
        this.initConfig("testMissingProjectId.yml");
        this.expectErrorOutput("testMissingProjectId.txt");

        this.executeCliCommand("lint");
    }

    @Test
    public void testMissingToken() {
        this.initConfig("testMissingToken.yml");
        this.expectErrorOutput("testMissingToken.txt");

        this.executeCliCommand("lint");
    }

    @Test
    public void testEmptySource() {
        this.initConfig("testEmptySource.yml");
        this.expectErrorOutput("testEmptySource.txt");

        this.executeCliCommand("lint");
    }

    @Test
    public void testEmptyTranslation() {
        this.initConfig("testEmptyTranslation.yml");
        this.expectErrorOutput("testEmptyTranslation.txt");

        this.executeCliCommand("lint");
    }

    @Test
    public void testEmptyFiles() {
        this.initConfig("testEmptyFiles.yml");
        this.expectErrorOutput("testEmptyFiles.txt");

        this.executeCliCommand("lint");
    }

    @Test
    public void testMissedBaseUrl() {
        this.initConfig("testMissedBaseUrl.yml");
        this.expectOutput("testMissedBaseUrl.txt");

        this.executeCliCommand("lint");
    }

    @Test
    public void testWrongBaseUrl() {
        this.initConfig("testWrongBaseUrl.yml");
        this.expectErrorOutput("testWrongBaseUrl.txt");

        this.executeCliCommand("lint");
    }

    @Test
    public void testNotAbsoluteBasePath() {
        this.initConfig("testNotAbsoluteBasePath.yml");
        this.expectErrorOutput("testNotAbsoluteBasePath.txt");

        this.executeCliCommand("lint");
    }

    @Test
    public void testNotADirectoryBasePath() {
        this.initConfig("testNotADirectoryBasePath.yml");
        this.expectErrorOutput("testNotADirectoryBasePath.txt");

        this.executeCliCommand("lint");
    }

    @Test
    public void testLangPlaceholder() {
        this.initConfig("testLangPlaceholder.yml");
        this.expectErrorOutput("testLangPlaceholder.txt");

        this.executeCliCommand("lint");
    }

    @Test
    public void testWrongUpdateOption() {
        this.initConfig("testWrongUpdateOption.yml");
        this.expectErrorOutput("testWrongUpdateOption.txt");

        this.executeCliCommand("lint");
    }

    @Test
    public void testWrongMask() {
        this.initConfig("testWrongMask.yml");
        this.expectOutput("testWrongMask.txt");

        this.executeCliCommand("lint");
    }
}
