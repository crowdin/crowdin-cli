package com.crowdin.cli.commands.functionality;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class BranchUtilsTest {

    @Test
    public void testNormalizeBranchName() {
        assertEquals(BranchUtils.normalizeBranchName("main|1>2"), "main.1.2");
        assertEquals(BranchUtils.normalizeBranchName("dev/1"), "dev.1");
        assertEquals(BranchUtils.normalizeBranchName("dev\\1"), "dev.1");
        assertEquals(BranchUtils.normalizeBranchName("feat:123?"), "feat.123.");
        assertEquals(BranchUtils.normalizeBranchName("base*"), "base.");
        assertEquals(BranchUtils.normalizeBranchName("test?\""), "test..");
        assertEquals(BranchUtils.normalizeBranchName("test<"), "test.");
    }
}
