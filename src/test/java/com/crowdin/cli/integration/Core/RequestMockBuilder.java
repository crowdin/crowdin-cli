package com.crowdin.cli.integration.Core;

import org.mockserver.client.server.MockServerClient;
import org.mockserver.model.Header;
import org.mockserver.model.HttpStatusCode;

import java.util.concurrent.TimeUnit;

import static org.mockserver.matchers.Times.exactly;
import static org.mockserver.model.HttpRequest.request;
import static org.mockserver.model.HttpResponse.response;
import static org.mockserver.model.JsonBody.json;

public class RequestMockBuilder {

    private static final TimeUnit DEFAULT_TIME_UNIT = TimeUnit.MILLISECONDS;
    private static final Integer DEFAULT_DELAY = 10;

    private RequestMock request;
    private ResponseMock response;

    private Integer requestsCount = 1;

    public RequestMockBuilder(RequestMock request, ResponseMock response) {
        this.request = request;
        this.response = response;
    }

    public RequestMockBuilder count(Integer count) {
        this.requestsCount = count;
        return this;
    }

    public void makeSimpleExpectation(MockServerClient mockServerClient) {
        mockServerClient.when(
            request()
                .withMethod(this.request.getMethod())
                .withPath(this.request.getPath()),
            exactly(this.requestsCount))
            .respond(
                response()
                    .withStatusCode(HttpStatusCode.OK_200.code())
                    .withHeaders(new Header("Content-Type", "application/json"))
                    .withBody(json(this.response.getBody()))
                    .withDelay(DEFAULT_TIME_UNIT, DEFAULT_DELAY)
            );
    }
}
