package com.crowdin.cli.utils;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * @author ihor
 */
public class Parser {

    public JSONObject parseJson(String source) {
        return new JSONObject(source);
    }

    public JSONArray parseJsonArray(String source) {
        return new JSONArray(source);
    }

}
