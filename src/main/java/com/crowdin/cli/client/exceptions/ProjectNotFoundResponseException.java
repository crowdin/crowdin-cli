package com.crowdin.cli.client.exceptions;

public class ProjectNotFoundResponseException extends ResponseException {

    public ProjectNotFoundResponseException() {
        super();
    }

    public ProjectNotFoundResponseException(String message) {
        super(message);
    }

    public ProjectNotFoundResponseException(String message, Throwable cause) {
        super(message, cause);
    }
}
