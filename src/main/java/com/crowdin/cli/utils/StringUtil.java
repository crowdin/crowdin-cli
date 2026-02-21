package com.crowdin.cli.utils;

import com.crowdin.client.sourcestrings.model.SourceString;

import java.util.HashMap;
import java.util.Map;

public class StringUtil {

    public static String getStringText(SourceString ss) {
        StringBuilder text = new StringBuilder();
        if (ss.getText() instanceof HashMap<?, ?>) {
            HashMap<?, ?> map = (HashMap<?, ?>) ss.getText();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                text.append(entry.getKey()).append(": ").append(entry.getValue()).append(" | ");
            }
            if (!text.isEmpty()) {
                text.delete(text.length() - 3, text.length());
            }
        } else {
            text.append((String) ss.getText());
        }
        return text.toString();
    }
}
