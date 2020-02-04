package com.crowdin.cli.commands;

import com.crowdin.cli.commands.parts.Command;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.cli.utils.file.FileUtil;
import picocli.CommandLine;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.ListIterator;
import java.util.Scanner;

import static com.crowdin.cli.properties.CliProperties.*;
import static com.crowdin.cli.utils.MessageSource.Messages.GENERATE_HELP_MESSAGE;

@CommandLine.Command(
    name = "generate",
    aliases = "init",
    customSynopsis = "@|fg(yellow) crowdin |@(@|fg(yellow) generate|@|@|fg(yellow) init|@) [CONFIG OPTIONS] [OPTIONS]",
    description = "Generate Crowdin CLI configuration skeleton")
public class GenerateSubcommand extends Command {

    @CommandLine.Option(names = {"-d", "--destination"}, description = "Where to save generated file", paramLabel = "...", defaultValue = "crowdin.yml")
    private Path destinationPath;

    @CommandLine.Option(names = "--skip-generate-description", hidden = true)
    private boolean skipGenerateDescription;

    @Override
    public void run() {
        System.out.println("destinationPath: " + destinationPath);
        System.out.println("skipGenerateDescription: " + skipGenerateDescription);
        try {
            System.out.println(RESOURCE_BUNDLE.getString("command_generate_description") + " '" + destinationPath + "'");
            if (Files.exists(destinationPath)) {
                System.out.println(ExecutionStatus.SKIPPED.getIcon() + "File '" + destinationPath + "' already exists.");
                return;
            }

            try {
                FileUtil.writeToFile(this.getClass().getResourceAsStream("/crowdin.yml"), destinationPath.toString());
            } catch (FileNotFoundException e) {
                throw new RuntimeException("The path specified doesn't contain");
            } catch (IOException e) {
                throw new RuntimeException("Couldn't create destination file", e);
            }

            if (!skipGenerateDescription) {
                System.out.println(GENERATE_HELP_MESSAGE.getString());
                List<String> dummyConfig = FileUtil.readFile(destinationPath.toFile());

                Scanner consoleScanner = new Scanner(System.in);
                String[] params = {API_TOKEN, PROJECT_ID, BASE_PATH, BASE_URL};
                for (String param : params) {
                    System.out.print(param.replaceAll("_", " ") + " : ");
                    String userInput = consoleScanner.nextLine();

                    ListIterator<String> dummyConfigIterator = dummyConfig.listIterator();
                    while (dummyConfigIterator.hasNext()) {
                        String defaultLine = dummyConfigIterator.next();
                        if (defaultLine.contains(param)) {
                            String lineWithUserInput = defaultLine.replaceFirst(": \"*\"", String.format(": \"%s\"", userInput));
                            dummyConfigIterator.set(lineWithUserInput);
                            try {
                                Files.write(destinationPath, dummyConfig);
                            } catch (IOException e) {
                                throw new RuntimeException("Couldn't write to file '" + destinationPath + "'", e);
                            }
                            break;
                        }
                    }
                }
            }
        } catch (Exception e) {
            throw new RuntimeException("Error while creating config file", e);
        }
    }
}
