package com.crowdin.cli.commands.actions;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.io.IOException;

import org.junit.jupiter.api.Test;
public class CheckNewVersionActionTest {
    @Test
    void getNewVersionMessageTest()throws IOException{
        String s=CheckNewVersionAction.getAppNewLatestVersion().get();
        assertEquals("3.15.0", s);
        
    }
}
