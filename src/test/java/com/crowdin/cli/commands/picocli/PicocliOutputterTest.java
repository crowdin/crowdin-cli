package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.Outputter;
import org.junit.jupiter.api.Test;

public class PicocliOutputterTest {

    @Test
    public void testOutputter() {
        Outputter outputter = new PicocliOutputter(System.out, true);
        outputter.println("Hello, Test!");
        outputter.print("Hello, Test!");
        outputter.println("");
    }
}
