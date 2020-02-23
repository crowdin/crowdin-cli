package com.crowdin.cli.integration;

import com.crowdin.cli.integration.Core.*;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

public class ListProjectCommandTest extends BaseIntegrationTest  {

    public ListProjectCommandTest() {
        this.testName = "listProjectCommandTest";
    }

    @BeforeAll
    static void setUp() {
        startMockServer();
    }

    @AfterAll
    static void tearDown() {
        stopMockServer();
    }

    @AfterEach
    public void resetMocks() {
        resetMockServer();
    }

    @Test
    public void testBasic() {
        this.initConfig("basic.yml");
        this.expectOutput("basic.txt");

        this.mockServerRequests(new RequestMockBuilder(
                (new RequestMock()).get().withPath("/projects/1"),
                (new ResponseMock()).withBody(this.getJson("projectInfo.json"))
        ));

        this.mockServerRequests(new RequestMockBuilder(
            (new RequestMock()).get().withPath("/projects/1/directories"),
            (new ResponseMock()).withData("[]").pageable()
        ));

        this.mockServerRequests(new RequestMockBuilder(
            (new RequestMock()).get().withPath("/projects/1/files"),
            (new ResponseMock()).withData(this.getJson("basicFilesList.json")).pageable()
        ));

        this.mockServerRequests(new RequestMockBuilder(
            (new RequestMock()).get().withPath("/projects/1/branches"),
            (new ResponseMock()).withData("[]").pageable()
        ));

        this.executeCliCommand("list project");
    }

    @Test
    public void testWithConfigOptions() {
        this.withConfigOptions((new ConfigOptions()).basePath(".").baseUrl(MOCK_BASE_URL).projectId(1));
        this.expectOutput("basic.txt");

        this.mockServerRequests(new RequestMockBuilder(
            (new RequestMock()).get().withPath("/projects/1"),
            (new ResponseMock()).withBody(this.getJson("projectInfo.json"))
        ));

        this.mockServerRequests(new RequestMockBuilder(
            (new RequestMock()).get().withPath("/projects/1/directories"),
            (new ResponseMock()).withData("[]").pageable()
        ));

        this.mockServerRequests(new RequestMockBuilder(
            (new RequestMock()).get().withPath("/projects/1/files"),
            (new ResponseMock()).withData(this.getJson("basicFilesList.json")).pageable()
        ));

        this.mockServerRequests(new RequestMockBuilder(
            (new RequestMock()).get().withPath("/projects/1/branches"),
            (new ResponseMock()).withData("[]").pageable()
        ));

        this.executeCliCommand("list project");
    }

    @Test
    public void testBranchesAndDirectories() {
        this.withConfigOptions((new ConfigOptions()).basePath(".").baseUrl(MOCK_BASE_URL).projectId(1));
        this.expectOutput("testBranchesAndDirectories.txt");

        this.mockServerRequests(new RequestMockBuilder(
            (new RequestMock()).get().withPath("/projects/1"),
            (new ResponseMock()).withBody(this.getJson("projectInfo.json"))
        ));

        this.mockServerRequests(new RequestMockBuilder(
            (new RequestMock()).get().withPath("/projects/1/directories"),
            (new ResponseMock()).withData(this.getJson("directoriesList.json")).pageable()
        ));

        this.mockServerRequests(new RequestMockBuilder(
            (new RequestMock()).get().withPath("/projects/1/files"),
            (new ResponseMock()).withData(this.getJson("branchesDirectoriesFilesList.json")).pageable()
        ));

        this.mockServerRequests(new RequestMockBuilder(
            (new RequestMock()).get().withPath("/projects/1/branches"),
            (new ResponseMock()).withData(this.getJson("branchesList.json")).pageable()
        ));

        this.executeCliCommand("list project -b master");
    }
}
