package com.crowdin.cli.utils;

import java.io.PrintWriter;

import static com.crowdin.cli.utils.console.ExecutionStatus.ERROR;

public class OutputUtil {

    public static void fancyErr(Throwable e, PrintWriter out, boolean debug) {
        if (debug) {
            e.printStackTrace();
        } else {
            out.println(ERROR.withIcon(e.getMessage()));
            Throwable cause = e;
            while ((cause = cause.getCause()) != null) {
                out.println(ERROR.withIcon(cause.getMessage()));
            }
        }
    }
}
