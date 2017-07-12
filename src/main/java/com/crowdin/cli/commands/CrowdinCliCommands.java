package com.crowdin.cli.commands;

import java.util.*;

import net.ricecode.similarity.LevenshteinDistanceStrategy;
import net.ricecode.similarity.SimilarityStrategy;
import net.ricecode.similarity.StringSimilarityService;
import net.ricecode.similarity.StringSimilarityServiceImpl;
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

    public static final String COMMAND_PULL = "pull";

    public static final String COMMAND_PUSH = "push";


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
        commands.add(COMMAND_PUSH);
        commands.add(COMMAND_PULL);

        List<String> arguments = cl.getArgList();
        StringBuilder resultCmd = new StringBuilder();
        boolean isArgumentsParsed = true;
        StringBuilder cliArgs = new StringBuilder();
        for (String argument : arguments) {
            cliArgs.append(argument)
                    .append(COMMAND_SEPARATOR);
            if (commands.contains(argument)) {
                resultCmd.append(argument).append(COMMAND_SEPARATOR);
            } else {
                isArgumentsParsed = false;
            }
        }
        if (!isArgumentsParsed) {
            String hint = commandHint(cliArgs.toString().trim());
            if (hint != null && !hint.isEmpty()) {
                System.out.println("Command '" + cliArgs.toString().trim() + "' does not exist. Did you mean '" + hint + "'? Y/n");
                Scanner scanner = new Scanner(System.in);
                if (scanner != null) {
                    if ("y".equalsIgnoreCase(scanner.next())) {
                        resultCmd = new StringBuilder();
                        resultCmd.append(hint);
                    }
                }
            }
        }
        return resultCmd.toString().trim();
    }

    private String commandHint(String command) {
        if (command == null || command.isEmpty()) {
            return "";
        }
        SimilarityStrategy strategy = new LevenshteinDistanceStrategy();
        StringSimilarityService service = new StringSimilarityServiceImpl(strategy);
        double score = 0;
        double s;
        String result = "";
        List<String> crowdinCommands = new LinkedList<>();
        crowdinCommands.add(COMMAND_UPLOAD);
        crowdinCommands.add(COMMAND_UPLOAD_SOURCES);
        crowdinCommands.add(COMMAND_TRANSLATIONS);
        crowdinCommands.add(COMMAND_UPLOAD_TRANSLATIONS);
        crowdinCommands.add(COMMAND_LINT);
        crowdinCommands.add(COMMAND_DOWNLAOD);
        crowdinCommands.add(COMMAND_DOWNLAOD_TRANSLATIONS);
        crowdinCommands.add(COMMAND_GENERATE);
        crowdinCommands.add(COMMAND_PROJECT);
        crowdinCommands.add(COMMAND_LIST_PROJECT);
        crowdinCommands.add(COMMAND_SOURCES);
        crowdinCommands.add(COMMAND_LIST);
        crowdinCommands.add(COMMAND_LIST_SOURCES);
        crowdinCommands.add(COMMAND_LIST_TRANSLATIONS);
        crowdinCommands.add(COMMAND_HELP);
        crowdinCommands.add(COMMAND_PUSH);
        crowdinCommands.add(COMMAND_PULL);
        for (String cmd : crowdinCommands) {
            s = service.score(cmd, command);
            if (s > score) {
                score = s;
                result = cmd;
            }
        }
        if (score < 0.5) {
            result = "";
        }
        return result;
    }
}
