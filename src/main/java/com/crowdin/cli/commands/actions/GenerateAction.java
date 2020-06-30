package com.crowdin.cli.commands.actions;

import com.crowdin.cli.utils.OAuthUtil;
import com.crowdin.cli.utils.console.ExecutionStatus;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Scanner;

import static com.crowdin.cli.BaseCli.*;
import static com.crowdin.cli.properties.CliProperties.*;

public class GenerateAction {

    public static final String BASE_PATH_DEFAULT = ".";
    public static final String BASE_URL_DEFAULT = "https://api.crowdin.com";
    public static final String BASE_ENTERPRISE_URL_DEFAULT = "https://%s.crowdin.com";

    private Scanner scanner = new Scanner(System.in);
    private boolean isEnterprise;
    private boolean withBrowser;

    public static final String LINK = "https://support.crowdin.com/configuration-file-v3/";
    public static final String ENTERPRISE_LINK = "https://support.crowdin.com/enterprise/configuration-file/";

    private Path destinationPath;
    private boolean skipGenerateDescription;

    public GenerateAction(Path destinationPath, boolean skipGenerateDescription) {
        this.destinationPath = destinationPath;
        this.skipGenerateDescription = skipGenerateDescription;
    }

    public void act() {
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
            withBrowser = !StringUtils.startsWithAny(ask(RESOURCE_BUNDLE.getString("message.ask_auth_via_browser") + ": (Y/n) "), "n", "N", "-");
            String organizationName;
            if (withBrowser) {
                String token = OAuthUtil.getToken(OAUTH_CLIENT_ID, OAURH_CLIENT_SECRET);
                organizationName = OAuthUtil.getDomainFromToken(token);
                values.put(API_TOKEN, token);
            } else {
                organizationName = ask(RESOURCE_BUNDLE.getString("message.ask_organization_name") + ": ");
            }
            if (StringUtils.isNotEmpty(organizationName)) {
                values.put(BASE_URL, String.format(BASE_ENTERPRISE_URL_DEFAULT, organizationName));
            } else {
                this.isEnterprise = false;
                values.put(BASE_URL, BASE_URL_DEFAULT);
            }
        } else {
            values.put(BASE_URL, BASE_URL_DEFAULT);
        }
        values.put(PROJECT_ID, askParam(PROJECT_ID));

        if (!withBrowser || !values.containsKey(API_TOKEN)) {
            values.put(API_TOKEN, askParam(API_TOKEN));
        }

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
