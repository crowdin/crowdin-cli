package com.crowdin.cli.utils;

import java.io.OutputStreamWriter;
import java.io.PrintStream;
import java.io.PrintWriter;
import java.nio.charset.StandardCharsets;

import static com.crowdin.cli.utils.console.ExecutionStatus.ERROR;

public class OutputUtil {

    public static void fancyErr(Throwable e, PrintStream out, boolean debug) {
        fancyErr(e, new PrintWriter(new OutputStreamWriter(out, StandardCharsets.UTF_8)), debug);
    }

    public synchronized static void fancyErr(Throwable e, PrintWriter out, boolean debug) {
        if (debug) {
            e.printStackTrace();
        } else {
            out.println(ERROR.withIcon(e.getMessage()));
            Throwable cause = e;
            while ((cause = cause.getCause()) != null) {
                out.println(ERROR.withIcon(cause.getMessage()));
            }
        }
        out.flush();
    }
}
