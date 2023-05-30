package com.crowdin.cli.client;

import com.crowdin.client.core.http.exceptions.HttpBadRequestException;
import com.crowdin.client.core.http.exceptions.HttpException;
import com.crowdin.client.core.model.DownloadLink;
import com.crowdin.client.core.model.ResponseList;
import com.crowdin.client.core.model.ResponseObject;
import com.crowdin.client.stringcomments.model.AddStringCommentRequest;
import com.crowdin.client.stringcomments.model.StringComment;
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
import java.util.function.Supplier;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

abstract class CrowdinClientCore {

    private static final long millisToRetry = 100;

    private static final Map<BiPredicate<String, String>, RuntimeException> standardErrorHandlers =
        new LinkedHashMap<BiPredicate<String, String>, RuntimeException>() {{
            put((code, message) -> code.equals("401"),
                new RuntimeException(RESOURCE_BUNDLE.getString("error.response.401")));
            put((code, message) -> code.equals("403") && message.contains("upgrade your subscription plan to upload more file formats"),
                    new RuntimeException(RESOURCE_BUNDLE.getString("error.response.403_upgrade_subscription")));
            put((code, message) -> code.equals("403"),
                new RuntimeException(RESOURCE_BUNDLE.getString("error.response.403")));
            put((code, message) -> code.equals("404") && StringUtils.containsIgnoreCase(message, "Project Not Found"),
                new RuntimeException(RESOURCE_BUNDLE.getString("error.response.404_project_not_found")));
            put((code, message) -> code.equals("404") && StringUtils.containsIgnoreCase(message, "Organization Not Found"),
                new RuntimeException(RESOURCE_BUNDLE.getString("error.response.404_organization_not_found")));
            put((code, message) -> StringUtils.containsAny(message,
                "PKIX path building failed",
                "sun.security.provider.certpath.SunCertPathBuilderException",
                "unable to find valid certification path to requested target"),
                new RuntimeException(RESOURCE_BUNDLE.getString("error.response.certificate")));
            put((code, message) -> message.equals("Name or service not known"),
                new RuntimeException(RESOURCE_BUNDLE.getString("error.response.url_not_known")));
            put((code, message) -> code.equals("<empty_code>") && message.equals("<empty_message>"),
                new RuntimeException("Empty error message from server"));
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

    protected static <T> T executeRequestWithPossibleRetry(BiPredicate<String, String> expectedError, Supplier<T> request) {
        Map<BiPredicate<String, String>, RepeatException> errorHandler = new LinkedHashMap<BiPredicate<String, String>, RepeatException>() {{
                put(expectedError, new RepeatException());
            }};
        try {
            return executeRequest(errorHandler, request);
        } catch (RepeatException e) {
            try {
                Thread.sleep(millisToRetry);
            } catch (InterruptedException ie) {
//                    ignore
            }
            return executeRequest(request);
        }
    }

    protected static <T> T executeRequestWithPossibleRetry(Map<BiPredicate<String, String>, ResponseException> errorHandlers, Supplier<T> request) throws ResponseException {
        try {
            return executeRequest(errorHandlers, request);
        } catch (RepeatException e) {
            try {
                Thread.sleep(millisToRetry);
            } catch (InterruptedException ie) {
//                    ignore
            }
            return executeRequest(request);
        }
    }

    protected static <T> T executeRequest(Supplier<T> r) {
        return executeRequest(new HashMap<BiPredicate<String, String>, RuntimeException>(), r);
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
            throw new RuntimeException(String.format("Error from server: <Code: %s, Message: %s>", code, message));
        } catch (Exception e) {
            throw e;
        }
    }

    private static <T, R extends Exception> void searchErrorHandler(Map<BiPredicate<String, String>, R> errorHandlers, String code, String message) throws R {
        for (Map.Entry<BiPredicate<String, String>, R> errorHandler : errorHandlers.entrySet()) {
            if (errorHandler.getKey().test(code, message)) {
                throw errorHandler.getValue();
            }
        }
        for (Map.Entry<BiPredicate<String, String>, RuntimeException> errorHandler : standardErrorHandlers.entrySet()) {
            if (errorHandler.getKey().test(code, message)) {
                throw errorHandler.getValue();
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
