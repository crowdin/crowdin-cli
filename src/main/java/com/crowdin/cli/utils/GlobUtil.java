package com.crowdin.cli.utils;

import java.util.regex.Pattern;

public class GlobUtil {

    private GlobUtil() {
    }

    /**
     * Matches text against a glob expression.
     */
    public static boolean matches(String glob, String text) {
        String regex = toRegex(glob);
        return Pattern.matches(regex, text);
    }

    /**
     * Converts glob pattern to Java regex.
     */
    public static String toRegex(String glob) {
        StringBuilder regex = new StringBuilder();
        int length = glob.length();
        boolean inGroup = false;

        for (int i = 0; i < length; i++) {
            char c = glob.charAt(i);

            switch (c) {
                case '*':
                    if (i + 1 < length && glob.charAt(i + 1) == '*') {
                        // ** -> any directories
                        regex.append(".*");
                        i++;
                    } else {
                        // * -> any except separator
                        regex.append("[^/]*");
                    }
                    break;

                case '?':
                    regex.append('.');
                    break;

                case '.':
                case '(':
                case ')':
                case '+':
                case '|':
                case '^':
                case '$':
                case '@':
                case '%':
                    regex.append("\\").append(c);
                    break;

                case '\\':
                    if (i + 1 < length) {
                        regex.append("\\").append(glob.charAt(++i));
                    }
                    break;

                case '[':
                    inGroup = true;
                    regex.append('[');
                    break;

                case ']':
                    inGroup = false;
                    regex.append(']');
                    break;

                case '!':
                    if (inGroup) regex.append('^');
                    else regex.append('!');
                    break;

                default:
                    regex.append(c);
            }
        }

        return "^" + regex + "$";
    }
}
