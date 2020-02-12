package com.crowdin.cli.client.exceptions;

public class OrganizationNotFoundResponseException extends ResponseException {

    public OrganizationNotFoundResponseException() {
        super();
    }

    public OrganizationNotFoundResponseException(String message) {
        super(message);
    }

    public OrganizationNotFoundResponseException(String message, Throwable cause) {
        super(message, cause);
    }
}
