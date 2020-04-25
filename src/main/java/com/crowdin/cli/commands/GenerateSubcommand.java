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
    aliases = "init")
public class GenerateSubcommand extends Command {

    @CommandLine.Option(names = {"-d", "--destination"}, paramLabel = "...", defaultValue = "crowdin.yml")
    private Path destinationPath;

    @CommandLine.Option(names = "--skip-generate-description", hidden = true)
    private boolean skipGenerateDescription;

    public static final String BASE_PATH_DEFAULT = ".";
    public static final String BASE_URL_DEFAULT = "https://api.crowdin.com";
    public static final String BASE_ENTERPRISE_URL_DEFAULT = "https://%s.crowdin.com";

    private Scanner scanner = new Scanner(System.in);
    private boolean isEnterprise;

    public static final String LINK = "https://support.crowdin.com/configuration-file-v3/";
    public static final String ENTERPRISE_LINK = "https://support.crowdin.com/enterprise/configuration-file/";

    @Override
    public void run() {
        try {
            System.out.println(String.format(RESOURCE_BUNDLE.getString("message.command_generate_description"), destinationPath.toAbsolutePath()));
            if (Files.exists(destinationPath)) {
                System.out.println(ExecutionStatus.SKIPPED.getIcon() + String.format(RESOURCE_BUNDLE.getString("message.already_exists"), destinationPath.toAbsolutePath()));
                return;
            }

            List<String> fileLines = this.readResource("/crowdin.yml");
            if (!skipGenerateDescription) {
                this.updateWithUserInputs(fileLines);
            }
            this.write(destinationPath, fileLines);
            System.out.println(String.format(RESOURCE_BUNDLE.getString("message.generate_successful"), this.isEnterprise ? ENTERPRISE_LINK : LINK));

        } catch (Exception e) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.create_file"), e);
        }
    }

    private void write(Path path, List<String> fileLines) {
        try {
            Files.write(destinationPath, fileLines);
        } catch (IOException e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.write_file"), destinationPath.toAbsolutePath()), e);
        }
    }

    private void updateWithUserInputs(List<String> fileLines) {
        Map<String, String> values = new HashMap<>();

        values.put(BASE_PATH, askWithDefault(RESOURCE_BUNDLE.getString("message.ask_project_directory"), BASE_PATH_DEFAULT));
        this.isEnterprise = StringUtils.startsWithAny(ask(RESOURCE_BUNDLE.getString("message.ask_is_enterprise") + ": (N/y) "), "y", "Y", "+");
        if (this.isEnterprise) {
            String organizationName = ask(RESOURCE_BUNDLE.getString("message.ask_organization_name") +": ");
            if (StringUtils.isNotEmpty(organizationName)) {
                values.put(ORGANIZATION, organizationName);
            } else {
                this.isEnterprise = false;
            }
        }
        values.put(PROJECT_ID, askParam(PROJECT_ID));
        values.put(API_TOKEN, askParam(API_TOKEN));

        for (String key : values.keySet()) {
            for (int i = 0; i < fileLines.size(); i++) {
                if (fileLines.get(i).contains(key)) {
                    fileLines.set(i, fileLines.get(i).replaceFirst(": \"*\"", String.format(": \"%s\"", values.get(key))));
                    break;
                }
            }
        }
    }

    private List<String> readResource(String fileName) {
        try {
            return IOUtils.readLines(this.getClass().getResourceAsStream(fileName), "UTF-8");
        } catch (IOException e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.read_resource_file"), fileName), e);
        }
    }

    private String askParam(String key) {
        return ask(StringUtils.capitalize(key.replaceAll("_", " ")) + ": ");
    }

    private String askWithDefault(String question, String def) {
        String input = ask(question + ": (" + def + ") ");
        return StringUtils.isNotEmpty(input) ? input : def;
    }

    private String ask(String question) {
        System.out.print(question);
        return scanner.nextLine();
    }
}