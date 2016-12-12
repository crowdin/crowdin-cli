package com.crowdin.cli.commands;

import java.util.HashSet;
import java.util.List;

import org.apache.commons.cli.CommandLine;

/**
 * @author ihor
 */
public class CrowdinCliCommands {

    private static final String COMMAND_UPLOAD = "upload";

    private static final String COMMAND_SOURCES = "sources";

    private static final String COMMAND_TRANSLATIONS = "translations";

    private static final String COMMAND_UPLOAD_SOURCES = "upload sources";

    private static final String COMMAND_UPLOAD_TRANSLATIONS = "upload translations";

    private static final String COMMAND_DOWNLAOD = "download";

    private static final String COMMAND_DOWNLAOD_TRANSLATIONS = "download translations";

    private static final String COMMAND_LIST = "list";

    private static final String COMMAND_PROJECT = "project";

    private static final String COMMAND_LIST_PROJECT = "list project";

    private static final String COMMAND_LIST_SOURCES = "list sources";

    private static final String COMMAND_LIST_TRANSLATIONS = "list translations";

    private static final String COMMAND_HELP = "help";

    private static final String COMMAND_LINT = "lint";

    private static final String COMMAND_GENERATE = "generate";

    private static final String COMMAND_SEPARATOR = " ";

    public String init(CommandLine cl) {
        HashSet<String> commands = new HashSet<>();
        commands.add(COMMAND_UPLOAD);
        commands.add(COMMAND_UPLOAD_SOURCES);
        commands.add(COMMAND_TRANSLATIONS);
        commands.add(COMMAND_UPLOAD_TRANSLATIONS);
        commands.add(COMMAND_LINT);
        commands.add(COMMAND_DOWNLAOD);
        commands.add(COMMAND_DOWNLAOD_TRANSLATIONS);
        commands.add(COMMAND_GENERATE);
        commands.add(COMMAND_PROJECT);
        commands.add(COMMAND_LIST_PROJECT);
        commands.add(COMMAND_SOURCES);
        commands.add(COMMAND_LIST);
        commands.add(COMMAND_LIST_SOURCES);
        commands.add(COMMAND_LIST_TRANSLATIONS);
        commands.add(COMMAND_HELP);
        List<String> arguments = cl.getArgList();
        StringBuilder resultCmd = new StringBuilder();
        for (String argument : arguments) {
            if (commands.contains(argument)) {
                resultCmd.append(argument).append(COMMAND_SEPARATOR);
            }
        }
        return resultCmd.toString().trim();
    }

}
