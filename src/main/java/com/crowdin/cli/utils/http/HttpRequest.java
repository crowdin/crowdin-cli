package com.crowdin.cli.utils.http;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.BufferedReader;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Data
@AllArgsConstructor(access = AccessLevel.PROTECTED)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
class HttpRequest {

    private String method;
    private String path;
    private Map<String, String> params;
    private Map<String, String> headers;
    private String data;

    public static HttpRequest parse(BufferedReader reader) {
        try {
            HttpRequest request = new HttpRequest();
            String line;

            line = reader.readLine();
            if (line != null && !line.equals("")) {
                String[] firstLine = line.split(" ");
                if (firstLine.length >= 1) {
                    request.setMethod(firstLine[0]);
                }
                Map<String, String> params = new HashMap<>();
                if (firstLine.length >= 2) {
                    String[] path = firstLine[1].split("\\?", 2);
                    request.setPath(path[0]);
                    if (path.length > 1) {
                        String[] paramsStr = path[1].split("&");
                        for (String param : paramsStr) {
                            String[] paramEntry = param.split("=", 2);
                            if (paramEntry.length > 1) {
                                params.put(paramEntry[0], paramEntry[1]);
                            }
                        }
                    }
                }
                request.setParams(params);
            }

            Map<String, String> headers = new HashMap<>();
            while (true) {
                line = reader.readLine();
                if (line == null || line.equals("")) {
                    break;
                }
                String[] header = line.split(": ", 2);
                if (header.length == 2) {
                    headers.put(header[0], header[1]);
                } else {
                    System.out.println(String.format("Couldn't parse header from line '%s'", line));
                }
            }
            request.setHeaders(headers);

            int contentLength = Integer.parseInt(request.getHeaders().getOrDefault("Content-Length", "-1"));
            if (contentLength > 0) {
                char[] charArray = new char[contentLength];
                if (reader.read(charArray, 0, contentLength) != -1) {
                    String postData = new String(charArray);
                    request.setData(postData);
                }
            }
            return request;
        } catch (IOException e) {
            throw new RuntimeException("Error while parsing request", e);
        }
    }
}
