package com.crowdin.cli.commands;

import com.crowdin.cli.commands.parts.Command;
import com.crowdin.cli.utils.console.ExecutionStatus;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;
import picocli.CommandLine;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Scanner;

import static com.crowdin.cli.properties.CliProperties.*;

@CommandLine.Command(
    name = "generate",
    aliases = "init",
    customSynopsis = "@|fg(yellow) crowdin |@(@|fg(yellow) generate|@|@|fg(yellow) init|@) [CONFIG OPTIONS] [OPTIONS]",
    description = "Generate Crowdin CLI configuration skeleton")
public class GenerateSubcommand extends Command {

    @CommandLine.Option(names = {"-d", "--destination"}, description = "Place where the configuration skeleton should be saved. Default: crowdin.yml", paramLabel = "...", defaultValue = "crowdin.yml")
    private Path destinationPath;

    @CommandLine.Option(names = "--skip-generate-description", hidden = true)
    private boolean skipGenerateDescription;

    public static final String BASE_PATH_DEFAULT = ".";
    public static final String BASE_URL_DEFAULT = "https://api.crowdin.com";
    public static final String BASE_ENTERPRISE_URL_DEFAULT = "https://%s.crowdin.com";

    private Scanner scanner = new Scanner(System.in);

    @Override
    public void run() {
        try {
            System.out.println(RESOURCE_BUNDLE.getString("command_generate_description") + " '" + destinationPath.toAbsolutePath() + "'");
            if (Files.exists(destinationPath)) {
                System.out.println(ExecutionStatus.SKIPPED.getIcon() + "File '" + destinationPath.toAbsolutePath() + "' already exists.");
                return;
            }

            List<String> file;
            try {
                file = IOUtils.readLines(this.getClass().getResourceAsStream("/crowdin.yml"), "UTF-8");
            } catch (IOException e) {
                throw new RuntimeException("Couldn't read from resource file", e);
            }

            if (!skipGenerateDescription) {
                Map<String, String> values = new HashMap<>();

                values.put(BASE_PATH, askParamWithDefault(BASE_PATH, BASE_PATH_DEFAULT));
                values.put(BASE_URL,
                        askParamWithDefault(BASE_URL,
                                StringUtils.startsWithAny(ask("Is it enterprise: (N/y) "), "y", "Y", "+")
                                        ? String.format(BASE_ENTERPRISE_URL_DEFAULT, ask("Enter your organization: "))
                                        : BASE_URL_DEFAULT));
                values.put(PROJECT_ID, askParam(PROJECT_ID));
                values.put(API_TOKEN, askParam(API_TOKEN));

                for (String key : values.keySet()) {
                    for (int i = 0; i < file.size(); i++) {
                        if (file.get(i).contains(key)) {
                            file.set(i, file.get(i).replaceFirst(": \"*\"", String.format(": \"%s\"", values.get(key))));
                            break;
                        }
                    }
                }
            }

            try {
                Files.write(destinationPath, file);
            } catch (IOException e) {
                throw new RuntimeException("Couldn't write to file '" + destinationPath.toAbsolutePath() + "'", e);
            }
        } catch (Exception e) {
            throw new RuntimeException("Error while creating config file", e);
        }
    }

    private String askParamWithDefault(String key, String def) {
        String input = ask(StringUtils.capitalize(key.replaceAll("_", " ")) + ": (" + def + ") ");
        return StringUtils.isNotEmpty(input) ? input : def;
    }

    private String askParam(String key) {
        return ask(StringUtils.capitalize(key.replaceAll("_", " ")) + ": ");
    }

    private String ask(String question) {
        System.out.print(question);
        return scanner.nextLine();
    }
}