package com.crowdin.cli.utils.http;

import java.io.PrintWriter;

@FunctionalInterface
public interface HttpListener {
    void accept(HttpRequest request, PrintWriter responseOut);
}
