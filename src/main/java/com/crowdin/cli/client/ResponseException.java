package com.crowdin.cli.client;

public class ResponseException extends Exception {

    public ResponseException() {

    }

    public ResponseException(String message) {
        super(message);
    }
}
