package com.crowdin.cli.utils.http;

import com.crowdin.cli.utils.OutputUtil;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.SocketException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;

public class SimpleHttpServer extends Thread {

    private final ServerSocketFactory factory;
    private final int port;
    private final boolean debug;
    private final Map<String, HttpListener> listeners = new ConcurrentHashMap<>();
    private ServerSocket serverSocket;
    private HttpListener defaultListener = (request, responseOut) -> {
        HttpResponse.notFoundHtml("<h1>404 Not Found!</h1>").send(responseOut);

        String method = (request.getMethod() != null) ? request.getMethod() : "<no_method>";
        String path = (request.getPath() != null) ? request.getPath() : "<no_path>";
        System.out.println(String.format("Unexpected %s request to '%s'", method, path));
    };

    public SimpleHttpServer(ServerSocketFactory factory, int port, boolean debug) {
        this.factory = factory;
        this.port = port;
        this.debug = debug;
    }

    @Override
    public void run() {
        try (ServerSocket serverSocket = factory.get(port)) {
            this.serverSocket = serverSocket;
            while (!serverSocket.isClosed()) {
                Socket socket = serverSocket.accept();
                try (BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
                     PrintWriter out = new PrintWriter(socket.getOutputStream())) {
                    HttpRequest request = HttpRequest.parse(in);
                    if (request.getPath() != null && listeners.containsKey(request.getPath())) {
                        listeners.get(request.getPath()).accept(request, out);
                    } else if (defaultListener != null) {
                        defaultListener.accept(request, out);
                    }
                } catch (IOException e) {
                    throw new RuntimeException(RESOURCE_BUNDLE.getString("error.in_local_server"), e);
                }
            }
        } catch (SocketException e) {
            if (e.getMessage() == null || !e.getMessage().contains("Socket closed")) {
                OutputUtil.fancyErr(e, new PrintWriter(System.err), debug);
            }
        } catch (Exception e) {
            OutputUtil.fancyErr(e, new PrintWriter(System.err), debug);
        }
    }

    public void close() {
        try {
            this.interrupt();
            this.serverSocket.close();
        } catch (IOException e) {
            throw new RuntimeException("Error while closing local server", e);
        }
    }

    public void addListener(String path, HttpListener listener) {
        listeners.put(path, listener);
    }

    public void setDefaultListener(HttpListener defaultListener) {
        this.defaultListener = defaultListener;
    }
}
