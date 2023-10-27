package com.crowdin.cli.commands.actions;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.io.IOException;

import org.junit.jupiter.api.Test;
public class CheckNewVersionActionTest {
    @Test
    void getNewVersionMessageTest()throws IOException{
        try{
            String s=CheckNewVersionAction.getAppNewLatestVersion().get();
            //if the previous line did not cause exception, then the version is not the latest
            //in this case, the string returned should be the latest version
            assertEquals("3.15.0", s);
        }catch(java.util.NoSuchElementException e){
            //latest version
        }
        
    }
}
