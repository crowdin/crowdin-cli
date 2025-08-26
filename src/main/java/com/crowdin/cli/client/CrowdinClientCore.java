package com.crowdin.cli.client;

import com.crowdin.cli.commands.picocli.ExitCodeExceptionMapper;
import com.crowdin.client.core.http.exceptions.HttpBadRequestException;
import com.crowdin.client.core.http.exceptions.HttpException;
import com.crowdin.client.core.model.DownloadLink;
import com.crowdin.client.core.model.ResponseList;
import com.crowdin.client.core.model.ResponseObject;
import org.apache.commons.lang3.StringUtils;

import java.io.IOException;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiFunction;
import java.util.function.BiPredicate;
import java.util.function.Function;
import java.util.function.Supplier;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

abstract class CrowdinClientCore {

    protected static final Map<BiPredicate<String, String>, Function<String, RuntimeException>> standardErrorHandlers =
            new LinkedHashMap<>() {{
                //401
                put((code, message) -> code.equals("401"),
                        (msg) -> new ExitCodeExceptionMapper.AuthorizationException(RESOURCE_BUNDLE.getString("error.response.401")));
                //403
                put((code, message) -> code.equals("403") && message.contains("upgrade your subscription plan to upload more file formats"),
                        (msg) -> new ExitCodeExceptionMapper.ForbiddenException(RESOURCE_BUNDLE.getString("error.response.403_upgrade_subscription")));
                //404
                put((code, message) -> code.equals("404") && StringUtils.containsIgnoreCase(message, "Project Not Found"),
                        (msg) -> new ExitCodeExceptionMapper.NotFoundException(RESOURCE_BUNDLE.getString("error.response.404_project_not_found")));
                put((code, message) -> code.equals("404") && StringUtils.containsIgnoreCase(message, "Organization Not Found"),
                        (msg) -> new ExitCodeExceptionMapper.NotFoundException(RESOURCE_BUNDLE.getString("error.response.404_organization_not_found")));
                put((code, message) -> code.equals("404") && StringUtils.containsIgnoreCase(message, "Bundle Not Found"),
                        (msg) -> new ExitCodeExceptionMapper.NotFoundException(RESOURCE_BUNDLE.getString("error.bundle.not_found_by_id")));
                put((code, message) -> code.equals("404") && StringUtils.containsIgnoreCase(message, "Screenshot Not Found"),
                        (msg) -> new ExitCodeExceptionMapper.NotFoundException(RESOURCE_BUNDLE.getString("error.screenshot.not_found_by_id")));
                //429
                put((code, message) -> code.equals("429"),
                        (msg) -> new ExitCodeExceptionMapper.RateLimitException(RESOURCE_BUNDLE.getString("error.response.429")));
                put((code, message) -> StringUtils.containsAny(message,
                                "PKIX path building failed",
                                "sun.security.provider.certpath.SunCertPathBuilderException",
                                "unable to find valid certification path to requested target"),
                        (msg) -> new RuntimeException(RESOURCE_BUNDLE.getString("error.response.certificate")));
                //specific message
                put((code, message) -> message.equals("Name or service not known"),
                        (msg) -> new RuntimeException(RESOURCE_BUNDLE.getString("error.response.url_not_known")));
                put((code, message) -> code.equals("<empty_code>") && message.equals("<empty_message>"),
                        (msg) -> new RuntimeException("Empty error message from server"));
                //generic
                put((code, message) -> code.equals("404"),
                        ExitCodeExceptionMapper.NotFoundException::new);
                put((code, message) -> code.equals("403"),
                        (msg) -> new ExitCodeExceptionMapper.ForbiddenException(String.format(RESOURCE_BUNDLE.getString("error.response.403"), msg)));
            }};

    /**
     * Util logic for downloading full lists.
     *
     * @param request represents function with two args (limit, offset)
     * @param <T> represents model
     * @return list of models accumulated from request function
     */
    protected static <T> List<T> executeRequestFullList(BiFunction<Integer, Integer, ResponseList<T>> request) {
        List<T> directories = new ArrayList<>();
        long counter;
        int limit = 500;
        do {
            List<T> dirs = unwrap(executeRequest(() -> request.apply(limit, directories.size())));
            directories.addAll(dirs);
            counter = dirs.size();
        } while (counter == limit);
        return directories;
    }

    protected static <T> T executeRequestWithPossibleRetries(Map<BiPredicate<String, String>, ResponseException> errorHandlers, Supplier<T> request, int maxAttempts, long millisToRetry) throws ResponseException {
        if (maxAttempts < 1) {
            throw new MaxNumberOfRetriesException();
        }
        try {
            return executeRequest(errorHandlers, request);
        } catch (RepeatException e) {
            try {
                Thread.sleep(millisToRetry);
            } catch (InterruptedException ie) {
//              ignore
            }
            System.out.println(String.format("%nAttempting to retry the request due to the error: %s", e.getMessage()));
            return executeRequestWithPossibleRetries(errorHandlers, request, maxAttempts - 1, millisToRetry);
        }
    }

    protected static <T> T executeRequest(Supplier<T> r) {
        return executeRequest(new HashMap<BiPredicate<String, String>, RuntimeException>(), r);
    }

    protected static void executeRequest(Runnable r) {
        executeRequest(() -> {
            r.run();
            return null;
        });
    }

    protected static <T, R extends Exception> T executeRequest(Map<BiPredicate<String, String>, R> errorHandlers, Supplier<T> r) throws R {
        try {
            return r.get();
        } catch (HttpBadRequestException e) {
            for (HttpBadRequestException.ErrorHolder eh : e.getErrors()) {
                for (HttpBadRequestException.Error error : eh.getError().errors) {
                    String code = (error.code != null) ? error.code : "<empty_code>";
                    String message = (error.message != null) ? error.message : "<empty_message>";
                    searchErrorHandler(errorHandlers, code, message);
                }
            }
            String errorMessage = "Wrong parameters: \n" + e.getErrors()
                .stream()
                .flatMap(holder -> holder.getError().getErrors()
                    .stream()
                    .map(error -> String.format("<key: %s, code: %s, message: %s>", holder.getError().getKey(), error.getCode(), error.getMessage())))
                .collect(Collectors.joining("\n"));
            throw new RuntimeException(errorMessage);
        } catch (HttpException e) {
            String code = (e.getError() != null && e.getError().code != null) ? e.getError().code : "<empty_code>";
            String message = (e.getError() != null && e.getError().message != null) ? e.getError().message : "<empty_message>";
            searchErrorHandler(errorHandlers, code, message);
            String errorMessage = String.format("Error from server: <Code: %s, Message: %s>", code, message);
            if (e.getHttpResponse() != null) {
                errorMessage += ", Response: " + e.getHttpResponse();
            }
            throw new RuntimeException(errorMessage);
        } catch (Exception e) {
            throw e;
        }
    }

    private static <R extends Exception> void searchErrorHandler(Map<BiPredicate<String, String>, R> errorHandlers, String code, String message) throws R {
        for (Map.Entry<BiPredicate<String, String>, R> errorHandler : errorHandlers.entrySet()) {
            if (errorHandler.getKey().test(code, message)) {
                throw errorHandler.getValue();
            }
        }
        for (Map.Entry<BiPredicate<String, String>, Function<String, RuntimeException>> errorHandler : standardErrorHandlers.entrySet()) {
            if (errorHandler.getKey().test(code, message)) {
                throw errorHandler.getValue().apply(message);
            }
        }
    }

    private static <T> List<T> unwrap(ResponseList<T> list) {
        return list
            .getData()
            .stream()
            .map(ResponseObject::getData)
            .collect(Collectors.toList());
    }

    protected URL url(DownloadLink downloadLink) {
        try {
            return new URL(downloadLink.getUrl());
        } catch (IOException e) {
            throw new RuntimeException("Unexpected exception: malformed download url: " + downloadLink.getUrl(), e);
        }
    }
}
