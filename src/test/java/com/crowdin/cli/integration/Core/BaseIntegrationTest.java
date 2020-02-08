package com.crowdin.cli.integration.Core;

import com.crowdin.cli.utils.Utils;

import java.io.*;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

abstract public class BaseIntegrationTest {

    protected String testName;

    private String cliOutput = "";
    private String cliErrors = "";

    private String configPath = "";
    private String expectedOutput = "";
    private String expectedErrorOutput = "";

    private boolean isConfigPassed = false;
    private boolean isExpectingOutput = false;
    private boolean isExpectingErrorOutput = false;

    protected void initConfig(String configName) {
        this.configPath = this.getConfigFilePath(configName);
        this.isConfigPassed = true;
    }

    protected void expectOutput(String outputFileName) {
        this.expectedOutput = this.getExpectedOutput(outputFileName);
        this.isExpectingOutput = true;
    }

    protected void expectErrorOutput(String outputFileName) {
        this.expectedErrorOutput = this.getExpectedOutput(outputFileName);
        this.isExpectingErrorOutput = true;
    }

    protected void executeCliCommand(String command) {
        try {
            ProcessBuilder builder = new ProcessBuilder(this.buildCommand(command));
            Process process = builder.start();

            process.waitFor();

            InputStream inputStream = process.getInputStream();
            InputStream errorStream = process.getErrorStream();

            byte[] b = new byte[inputStream.available()];
            byte[] c = new byte[errorStream.available()];

            if (inputStream.read(b, 0, b.length) > 0) {
                this.cliOutput = new String(b);
            }

            if (errorStream.read(c, 0, c.length) > 0) {
                this.cliErrors = new String(c);
            }

            this.postProcessCommandExecution();
        } catch (Exception e) {
            System.out.println("Error while reading CLI output. Message: " + e.getMessage());
            e.printStackTrace();
        }
    }

    protected String getOutput() {
        return this.normalizeNewLines(this.cliOutput);
    }

    protected String getErrors() {
        return this.normalizeNewLines(this.cliErrors);
    }

    private void postProcessCommandExecution() {
        if (this.isExpectingOutput) {
            assertEquals(this.expectedOutput, this.getOutput());
        } else if (this.isExpectingErrorOutput) {
            assertEquals(this.expectedErrorOutput, this.getErrors());
        }
    }

    private String getExpectedOutput(String fileName) {
        try {
            InputStream inputStream = new FileInputStream(this.getExpectedFilePath(fileName));
            BufferedReader bufferedReader = new BufferedReader(new InputStreamReader(inputStream));

            String line = bufferedReader.readLine();
            StringBuilder stringBuilder = new StringBuilder();

            while(line != null) {
                stringBuilder.append(line).append("\n");
                line = bufferedReader.readLine();
            }

            return this.normalizeNewLines(stringBuilder.toString());
        } catch (Exception e) {
            System.out.println("Error while reading expected output. Message: " + e.getMessage());
            e.printStackTrace();

            return "";
        }
    }

    private String[] buildCommand(String command) {
        List<String> args = new ArrayList<>();

        args.add("java");
        args.add("-javaagent:libs/jacocoagent.jar=destfile=build/jacoco/test.exec,includes=com.crowdin.cli.*");
        args.add("-jar");
        args.add(this.getCLiPath());
        args.add(command);

        if (this.isConfigPassed) {
            args.add("-c");
            args.add(this.configPath);
        }

        return args.toArray(new String[0]);
    }

    private String getCLiPath() {
        return "build/libs/crowdin-cli-" + Utils.getAppVersion() + ".jar";
    }

    private String getExpectedFilePath(String fileName) {
        Path resourceDirectory = Paths.get("src", "test", "resources");
        String absolutePath = resourceDirectory.toFile().getAbsolutePath();

        return absolutePath
            + "/integration/"
            + this.testName
            + "/Expected/"
            + fileName;
    }

    private String getConfigFilePath(String fileName) {
        Path resourceDirectory = Paths.get("src", "test", "resources");
        String absolutePath = resourceDirectory.toFile().getAbsolutePath();

        return absolutePath
            + "/integration/"
            + this.testName
            + "/Config/"
            + fileName;
    }

    private String normalizeNewLines(String string) {
        return string
            .replaceAll("\\r\\n", "\n")
            .replaceAll("\\r", "\n");
    }
}
