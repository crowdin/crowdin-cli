package com.crowdin.cli.integration.Core;

public class RequestMock {

    private static final String API_BASE = "/api/v2";

    private String method;
    private String path;
    private String body;

    public RequestMock get() {
        this.method = "GET";
        return this;
    }

    public RequestMock post() {
        this.method = "POST";
        return this;
    }

    public RequestMock put() {
        this.method = "PUT";
        return this;
    }

    public RequestMock patch() {
        this.method = "PATCH";
        return this;
    }

    public RequestMock delete() {
        this.method = "DELETE";
        return this;
    }

    public RequestMock withPath(String path) {
        this.path = API_BASE + path;
        return this;
    }

    public RequestMock withBody(String body) {
        this.body = body;
        return this;
    }

    public String getMethod() {
        return method;
    }

    public String getPath() {
        return path;
    }

    public String getBody() {
        return body;
    }
}
