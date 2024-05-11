package com.crowdin.cli.commands.picocli;

import java.util.HashMap;
import java.util.Map;

public class ExitCodeExceptionMapper {

    private static final Map<Class<? extends Throwable>, Integer> MAPPING = new HashMap<Class<? extends Throwable>, Integer>() {{
        put(ValidationException.class, 2);
        put(AuthorizationException.class, 101);
        put(NotFoundException.class, 102);
        put(ForbiddenException.class, 103);
        put(RateLimitException.class, 129);
    }};

    public static RuntimeException remap(Throwable throwable, String message) {
        if (isApplicable(throwable)) {
            return new ExitCodeException(message, throwable, getExitCode(throwable));
        }
        return new RuntimeException(message, throwable);
    }

    public static boolean isApplicable(Throwable throwable) {
        return MAPPING.containsKey(throwable.getClass());
    }

    public static int getExitCode(Throwable exception) {
        if (exception instanceof ExitCodeException) {
            return ((ExitCodeException) exception).code;
        }
        return MAPPING.getOrDefault(exception.getClass(), 1);
    }

    public static class ValidationException extends RuntimeException {
        public ValidationException(String message) {
            super(message);
        }

        public ValidationException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    public static class NotFoundException extends RuntimeException {
        public NotFoundException(String message) {
            super(message);
        }

        public NotFoundException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    public static class AuthorizationException extends RuntimeException {
        public AuthorizationException(String message) {
            super(message);
        }

        public AuthorizationException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    public static class ForbiddenException extends RuntimeException {
        public ForbiddenException(String message) {
            super(message);
        }

        public ForbiddenException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    public static class RateLimitException extends RuntimeException {
        public RateLimitException(String message) {
            super(message);
        }

        public RateLimitException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    public static class ExitCodeException extends RuntimeException {

        public int code;

        public ExitCodeException(String message, Throwable cause, int code) {
            super(message, cause);
            this.code = code;
        }
    }
}
