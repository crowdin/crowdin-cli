package com.crowdin.cli.client;

import com.crowdin.client.core.http.exceptions.HttpBadRequestException;
import com.crowdin.client.core.http.exceptions.HttpException;
import com.crowdin.client.core.model.ResponseList;
import com.crowdin.client.core.model.ResponseObject;
import org.apache.commons.lang3.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.function.BiFunction;
import java.util.stream.Collectors;

public class CrowdinClientCore {

    private final static long millisToRetry = 100;

    protected static <T> List<T> unwrap(ResponseList<T> list) {
        return list
            .getData()
            .stream()
            .map(ResponseObject::getData)
            .collect(Collectors.toList());
    }

    /**
     *
     * @param request represents function with two args (limit, offset)
     * @param <T> represents model
     * @return list of models accumulated from request function
     */
    protected static <T> List<T> executeRequestFullList(BiFunction<Integer, Integer, List<T>> request) {
        List<T> directories = new ArrayList<>();
        long counter;
        int limit = 500;
        do {
            List<T> dirs = executeRequest(() -> request.apply(limit, directories.size()));
            directories.addAll(dirs);
            counter = dirs.size();
        } while (counter == limit);
        return directories;
    }

    protected static <T> T executeRequestWithRetryIfErrorContains(Callable<T> request, String errorMessageContains) {
        try {
            return executeRequest(request);
        } catch (Exception e) {
            if (StringUtils.contains(e.getMessage(), errorMessageContains)) {
                try {
                    Thread.sleep(millisToRetry);
                } catch (InterruptedException ee) {
                }
                return executeRequest(request);
            } else {
                throw new RuntimeException(e.getMessage());
            }
        }
    }

    protected static <T> T executeRequest(Callable<T> r){
        try {
            return r.call();
        } catch (HttpBadRequestException e) {
            String errorMessage = e.getErrors()
                .stream()
                .flatMap(holder -> holder.getError().getErrors()
                    .stream()
                    .map(error -> holder.getError().getKey() + ": " + error.getCode() + ": " + error.getMessage()))
                .collect(Collectors.joining("\n"));
            throw new RuntimeException(errorMessage);
        } catch (HttpException e) {
            throw new RuntimeException(e.getError().code + ": " + e.getError().message);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    protected static boolean exceptionMessageContainsAll(Exception e, String... strings) {
        if (e == null || e.getMessage() == null) {
            return false;
        }
        for (String string : strings) {
            if (!StringUtils.containsIgnoreCase(e.getMessage(), string)) {
                return false;
            }
        }
        return true;
    }
}
