package com.crowdin.cli.utils;

import com.crowdin.cli.BaseCli;
import org.apache.commons.lang3.StringUtils;

import java.util.List;

public class CommandUtils extends BaseCli {

    public static String getCommonPath(List<String> sources, String basePath) {
        String prepBasePath = StringUtils.removeStart(basePath, Utils.PATH_SEPARATOR);
        return StringUtils.removeStart(getCommonPath(sources), prepBasePath);
    }

    public static String getCommonPath(List<String> sources) {
        String result = "";
        String commonPrefix = StringUtils.getCommonPrefix(sources.toArray(new String[0]));
        result = commonPrefix.substring(0, commonPrefix.lastIndexOf(Utils.PATH_SEPARATOR)+1);
        result = StringUtils.removeStart(result, Utils.PATH_SEPARATOR);
        return result;
    }
}
