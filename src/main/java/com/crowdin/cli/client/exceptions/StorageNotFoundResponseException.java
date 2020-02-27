package com.crowdin.cli.client.exceptions;

public class StorageNotFoundResponseException extends ResponseException {

    public StorageNotFoundResponseException() {
        super();
    }

    public StorageNotFoundResponseException(String message) {
        super(message);
    }

    public StorageNotFoundResponseException(String message, Throwable cause) {
        super(message, cause);
    }
}
