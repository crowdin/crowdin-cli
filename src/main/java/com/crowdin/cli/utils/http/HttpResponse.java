package com.crowdin.cli.utils.http;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.PrintWriter;
import java.util.HashMap;
import java.util.Map;

@Data
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class HttpResponse {

    private String code;
    private Map<String, String> headers;
    private String body;

    public void send(PrintWriter out) {
        out.println("HTTP/1.1 " + code);
        if (headers != null) {
            for (Map.Entry<String, String> header : headers.entrySet()) {
                out.println(String.format("%s: %s", header.getKey(), header.getValue()));
            }
        }
        out.println();
        if (body != null) {
            out.println(body);
        }
        out.flush();
    }

    public static HttpResponse redirect(String url) {
        Map<String, String> headers = new HashMap<>();
        headers.put("Location", url);
        return new HttpResponse("301", headers, null);
    }

    public static HttpResponse notFoundHtml(String body) {
        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", "text/html; charset=utf-8");
        return new HttpResponse("404 Not Found", headers, body);
    }

    public static HttpResponse ok(String body) {
        Map<String, String> headers = new HashMap<>();
        headers.put("Content-Type", "text/html; charset=utf-8");
        return new HttpResponse("200", headers, body);
    }
}
