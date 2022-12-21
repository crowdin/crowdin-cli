package com.crowdin.cli.client;

public class EmptyFileException extends ResponseException {

    public EmptyFileException(String message) {
        super(message);
    }
}
