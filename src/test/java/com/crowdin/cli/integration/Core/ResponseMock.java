package com.crowdin.cli.integration.Core;

public class ResponseMock {

    private String body;
    private String data;
    private String error;

    private Integer limit = 0;
    private Integer offset = 25;

    private boolean isPageable = false;
    private boolean needPrepare = true;

    public String getBody() {
        if (this.needPrepare) {
            String responseBody = "{";

            if (this.data != null) {
                responseBody += "\"data\": " + this.data;
            } else if (this.error != null) {
                responseBody += "\"error\": " + this.error;
            }

            if (this.isPageable) {
                responseBody += ", \"pagination\": " +
                    "{" +
                        "\"limit\": " + this.limit + "," +
                        "\"offset\": " + this.offset +
                    "}";
            }

            responseBody += "}";

            return responseBody;
        }

        return this.body;
    }

    public ResponseMock withBody(String body) {
        this.body = body;
        this.needPrepare = false;

        return this;
    }

    public ResponseMock pageable() {
        this.isPageable = true;

        return this;
    }

    public ResponseMock pageable(Integer limit, Integer offset) {
        this.isPageable = true;
        this.limit = limit;
        this.offset = offset;

        return this;
    }

    public ResponseMock withData(String data) {
        this.data = data;

        return this;
    }

    public ResponseMock withError(String error) {
        this.error = error;

        return this;
    }
}
