package com.crowdin.cli.utils.http;

import java.io.PrintWriter;

@FunctionalInterface
interface HttpListener {
    void accept(HttpRequest request, PrintWriter responseOut);
}
