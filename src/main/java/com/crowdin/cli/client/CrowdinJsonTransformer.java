package com.crowdin.cli.client;

import com.crowdin.client.core.http.JsonTransformer;
import com.crowdin.client.core.http.exceptions.CrowdinApiException;
import com.crowdin.client.core.http.exceptions.HttpException;
import lombok.SneakyThrows;
import org.apache.commons.lang3.StringUtils;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class CrowdinJsonTransformer implements JsonTransformer {

    private static final Pattern TITLE =
        Pattern.compile("<title[^>]*>(.*?)</title>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern BODY =
        Pattern.compile("<body[^>]*>(.*?)</body>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);
    private static final Pattern TAGS = Pattern.compile("<[^>]+>");
    private static final Pattern STATUS_CODE = Pattern.compile("\\b([1-5]\\d{2})\\b");

    private static final int MAX_BODY_LENGTH = 1000;

    private final JsonTransformer delegate;

    public CrowdinJsonTransformer(JsonTransformer delegate) {
        this.delegate = delegate;
    }

    @Override
    @SuppressWarnings("unchecked")
    @SneakyThrows
    public <T> T parse(String json, Class<T> clazz) {
        try {
            return delegate.parse(json, clazz);
        } catch (Exception e) {
            if (isErrorType(clazz) && looksLikeHtml(json)) {
                return (T) fromHtml(json);
            }
            throw e;
        }
    }

    @Override
    public <T> String convert(T obj) {
        return delegate.convert(obj);
    }

    private static boolean isErrorType(Class<?> clazz) {
        return clazz != null && CrowdinApiException.class.isAssignableFrom(clazz);
    }

    static boolean looksLikeHtml(String body) {
        if (StringUtils.isBlank(body)) {
            return false;
        }
        String trimmed = body.trim();
        return trimmed.charAt(0) == '<'
            && (StringUtils.startsWithIgnoreCase(trimmed, "<!doctype html")
                || StringUtils.containsIgnoreCase(trimmed, "<html")
                || StringUtils.containsIgnoreCase(trimmed, "<body"));
    }

    private static HttpException fromHtml(String html) {
        String title = extractTitle(html);
        String bodyText = extractBodyText(html);
        String summary = StringUtils.firstNonBlank(title, bodyText, "Non-JSON response from server");
        HttpException exception = HttpException.fromMessage(summary, truncate(html));
        String code = extractStatusCode(StringUtils.firstNonBlank(title, bodyText));
        if (code != null) {
            exception.getError().setCode(code);
        }
        return exception;
    }

    static String extractTitle(String html) {
        Matcher matcher = TITLE.matcher(html);
        return matcher.find() ? stripTags(matcher.group(1)) : null;
    }

    static String extractBodyText(String html) {
        Matcher matcher = BODY.matcher(html);
        return stripTags(matcher.find() ? matcher.group(1) : html);
    }

    static String extractStatusCode(String text) {
        if (text == null) {
            return null;
        }
        Matcher matcher = STATUS_CODE.matcher(text);
        return matcher.find() ? matcher.group(1) : null;
    }

    private static String stripTags(String html) {
        if (html == null) {
            return null;
        }
        return StringUtils.trimToNull(StringUtils.normalizeSpace(unescape(TAGS.matcher(html).replaceAll(" "))));
    }

    private static String unescape(String html) {
        return html
            .replace("&nbsp;", " ")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&#39;", "'")
            .replace("&amp;", "&");
    }

    private static String truncate(String body) {
        return body.length() > MAX_BODY_LENGTH ? body.substring(0, MAX_BODY_LENGTH) + "..." : body;
    }
}
