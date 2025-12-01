package com.crowdin.cli.utils.cache;

import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.utils.Utils;
import org.json.JSONObject;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.ERROR;

public class Cache {

    private static final String CACHE_LOCATION = System.getProperty("user.home") + Utils.PATH_SEPARATOR + ".crowdin" + Utils.PATH_SEPARATOR + "cache.json";

    private static JSONObject CACHE = new JSONObject();

    public static void initialize(boolean plainView, Outputter out) {
        try {
            if (!Files.exists(Paths.get(CACHE_LOCATION))) {
                return;
            }

            String json = String.join("", Files.readAllLines(Paths.get(CACHE_LOCATION)));

            CACHE = new JSONObject(json);
        } catch (Exception e) {
            if (!plainView) {
                out.println(ERROR.withIcon(RESOURCE_BUNDLE.getString("error.cache_init")));
            } else {
                out.println(RESOURCE_BUNDLE.getString("error.cache_init"));
            }
        }
    }

    public static void save(boolean plainView, Outputter out) {
        try {
            Files.createDirectories(Paths.get(CACHE_LOCATION).getParent());
            Files.write(Paths.get(CACHE_LOCATION), CACHE.toString(4).getBytes());
        } catch (Exception e) {
            if (!plainView) {
                out.println(ERROR.withIcon(RESOURCE_BUNDLE.getString("error.cache_save")));
            } else {
                out.println(RESOURCE_BUNDLE.getString("error.cache_save"));
            }
        }
    }

    public static Map<String, String> getSourceHashes() {
        if (!CACHE.has("sourceHashes")) {
            CACHE.put("sourceHashes", new HashMap<>());
        }
        JSONObject obj = CACHE.getJSONObject("sourceHashes");
        return obj.toMap().entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().toString()));
    }

    public static void setSourceHashes(Map<String, String> sourceHashes) {
        CACHE.put("sourceHashes", sourceHashes);
    }
}
