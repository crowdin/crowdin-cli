package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.utils.Utils;
import org.junit.jupiter.api.Test;
import picocli.CommandLine;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class PicocliRunnerTest extends PicocliTestUtils {

    @Test
    public void testHasMatchedArgs() {
        PicocliRunner picocliRunner = PicocliRunner.getInstance();
        assertFalse(picocliRunner.hasMatchedArg("plain"));
        picocliRunner.execute(actionsMock, CommandNames.DOWNLOAD, "--plain");
        assertTrue(picocliRunner.hasMatchedArg("plain"));
        picocliRunner.execute(actionsMock, CommandNames.DOWNLOAD);
        assertFalse(picocliRunner.hasMatchedArg("plain"));
        picocliRunner.execute(actionsMock, "--verbose");
        assertTrue(picocliRunner.hasMatchedArg("verbose"));
    }

    @Test
    public void testVersionProvider() throws Exception {
        CommandLine.IVersionProvider versionProvider = new PicocliRunner.VersionProvider();
        String[] versionMessage = versionProvider.getVersion();
        assertEquals(1, versionMessage.length);
        assertEquals(Utils.getAppVersion(), versionProvider.getVersion()[0]);
    }
}
