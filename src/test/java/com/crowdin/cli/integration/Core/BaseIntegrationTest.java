package com.crowdin.cli.integration.Core;

import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleUtils;
import org.mockserver.client.server.MockServerClient;
import org.mockserver.integration.ClientAndServer;
import org.mockserver.model.HttpRequest;
import org.opentest4j.AssertionFailedError;

import java.io.*;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockserver.model.HttpRequest.request;

abstract public class BaseIntegrationTest {

    private static final String MOCK_HOST = "localhost";
    private static final Integer MOCK_PORT = 1080;

    protected static final String MOCK_BASE_URL = "http://" + MOCK_HOST + ":" + MOCK_PORT;

    protected static ClientAndServer mockServer;
    protected static MockServerClient mockServerClient;

    protected String testName;

    private String cliOutput = "";
    private String cliErrors = "";

    private String configPath = "";
    private String expectedOutput = "";
    private String expectedErrorOutput = "";

    private boolean isConfigPassed = false;
    private boolean hasConfigOptions = false;
    private boolean isExpectingOutput = false;
    private boolean isExpectingErrorOutput = false;

    private ConfigOptions configOptions;

    private List<String> mockedRequests = new ArrayList<>();

    public void executeCliCommand(String command) {
        try {
            String[] commands = command.split("\\s+");

            ProcessBuilder builder = new ProcessBuilder(this.buildCommand(commands));
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

    protected static void startMockServer() {
        if (mockServer != null) {
            return;
        }

        mockServer = ClientAndServer.startClientAndServer(MOCK_PORT);
        mockServerClient = new MockServerClient(MOCK_HOST, MOCK_PORT);
    }

    protected static void resetMockServer() {
        mockServer.reset();
    }

    protected static void stopMockServer() {
        mockServer.stop();
    }

    protected void initConfig(String configName) {
        this.configPath = this.getResourceFilePath(configName, "Config");
        this.isConfigPassed = true;
    }

    protected void withConfigOptions(ConfigOptions configOptions) {
        this.configOptions = configOptions;
        this.hasConfigOptions = true;
    }

    protected void expectOutput(String outputFileName) {
        this.expectedOutput = this.getExpectedOutput(outputFileName);
        this.isExpectingOutput = true;
    }

    protected void expectErrorOutput(String outputFileName) {
        this.expectedErrorOutput = this.getExpectedOutput(outputFileName);
        this.isExpectingErrorOutput = true;
    }

    protected void mockServerRequests(RequestMockBuilder builder) {
        builder.makeSimpleExpectation(mockServer);

        this.mockedRequests.add(builder.getRequest().getPath());
    }

    protected String getOutput() {
        return this.normalizeNewLines(this.cliOutput);
    }

    protected String getErrors() {
        return this.normalizeNewLines(this.cliErrors);
    }

    protected String getJson(String fileName) {
        return this.readResourceFile(fileName, "Json");
    }

    private void postProcessCommandExecution() {
        try {
            if (this.isExpectingOutput) {
                assertEquals(this.expectedOutput, this.postProcessOutput(this.getOutput()));
            } else if (this.isExpectingErrorOutput) {
                assertEquals(this.expectedErrorOutput, this.postProcessOutput(this.getErrors()));
            }
        } catch (AssertionFailedError e) {
            if (mockServer != null) {
                this.printAllRecordedRequests();
                this.printAllMockedRequests();
            }

            throw e;
        }
    }

    private void printAllRecordedRequests() {
        HttpRequest[] recordedRequests = mockServer.retrieveRecordedRequests(request());

        System.err.println("[RECORDED REQUESTS][BEGIN]-----------------------");

        for (HttpRequest request: recordedRequests) {
            System.out.println(request.getPath());
        }

        System.err.println("[RECORDED REQUESTS][END]-------------------------");
    }

    private void printAllMockedRequests() {
        System.err.println("[MOCKED REQUESTS][BEGIN]-------------------------");

        for (String request: this.mockedRequests) {
            System.out.println(request);
        }

        System.err.println("[MOCKED REQUESTS][END]---------------------------");
    }

    private String postProcessOutput(String output) {
        if (ConsoleUtils.isWindows()) {
            return output;
        }

        output = output
            .replace("\u2714 ", "[OK]")
            .replace("\u26D4 ", "[ERROR]")
            .replace("\u26A0 ", "[WARNING]")
            .replace("\u23ED ", "[SKIPPED]")
            .replace("/", "\\");

        return output;
    }

    private String getExpectedOutput(String fileName) {
        return this.readResourceFile(fileName, "Expected");
    }

    private String readResourceFile(String fileName, String resourceType) {
        try {
            InputStream inputStream = new FileInputStream(this.getResourceFilePath(fileName, resourceType));
            BufferedReader bufferedReader = new BufferedReader(new InputStreamReader(inputStream));

            String line = bufferedReader.readLine();
            StringBuilder stringBuilder = new StringBuilder();

            while(line != null) {
                stringBuilder.append(line).append("\n");
                line = bufferedReader.readLine();
            }

            return this.normalizeNewLines(stringBuilder.toString());
        } catch (Exception e) {
            System.out.println("Error while reading resource type " + resourceType + ". Message: " + e.getMessage());
            e.printStackTrace();

            return e.getMessage();
        }
    }

    private String[] buildCommand(String[] command) {
        List<String> args = new ArrayList<>();

        args.add("java");
        args.add("-javaagent:libs/jacocoagent.jar=destfile=build/jacoco/test.exec,includes=com.crowdin.cli.*");
        args.add("-jar");
        args.add(this.getCLiPath());

        Collections.addAll(args, command);

        args.add("--no-progress");

        if (this.isConfigPassed) {
            args.add("-c");
            args.add(this.configPath);
        }

        if (this.hasConfigOptions) {
            Collections.addAll(args, this.configOptions.prepare());
        }

        return args.toArray(new String[0]);
    }

    private String getCLiPath() {
        return "build/libs/crowdin-cli-" + Utils.getAppVersion() + ".jar";
    }

    private String getResourceFilePath(String fileName, String resourceType) {
        Path resourceDirectory = Paths.get("src", "test", "resources");
        String absolutePath = resourceDirectory.toFile().getAbsolutePath();

        return absolutePath
            + "/integration/"
            + this.testName
            + "/" + resourceType + "/"
            + fileName;
    }

    private String normalizeNewLines(String string) {
        return string
            .replaceAll("\\r\\n", "\n")
            .replaceAll("\\r", "\n");
    }
}
