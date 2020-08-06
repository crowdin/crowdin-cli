package com.crowdin.cli.client.models;

import com.crowdin.client.core.http.exceptions.HttpBadRequestException;
import com.crowdin.client.core.http.exceptions.HttpException;

import java.util.Arrays;

public class HttpExceptionBuilder {

    public static HttpException build(String code, String message) {
        HttpException exception = new HttpException();
        HttpException.Error error = new HttpException.Error();
        error.setCode(code);
        error.setMessage(message);
        exception.setError(error);
        return exception;
    }

    public static HttpBadRequestException buildBadRequest(String key, String code, String message) {
        return new HttpBadRequestException() {{
            setErrors(Arrays.asList(new ErrorHolder() {{
                setError(new ErrorKey() {{
                    setKey(key);
                    setErrors(Arrays.asList(new Error() {{
                        setCode(code);
                        setMessage(message);
                    }}));
                }});
            }}));
        }};
    }
}
