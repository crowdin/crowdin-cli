package com.crowdin.cli.client;

class RepeatException extends ResponseException {

    public RepeatException() {
        super();
    }

    public RepeatException(String message) {
        super(message);
    }
}
