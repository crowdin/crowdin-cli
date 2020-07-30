package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.CrowdinClient;
import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.utils.OAuthUtil;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.cli.utils.console.ExecutionStatus;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Scanner;

import static com.crowdin.cli.BaseCli.OAUTH_CLIENT_ID;
import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.properties.CliProperties.API_TOKEN;
import static com.crowdin.cli.properties.CliProperties.BASE_PATH;
import static com.crowdin.cli.properties.CliProperties.BASE_URL;
import static com.crowdin.cli.properties.CliProperties.PROJECT_ID;
import static com.crowdin.cli.utils.console.ExecutionStatus.ERROR;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

public class GenerateAction implements Action {

    public static final String BASE_PATH_DEFAULT = ".";
    public static final String BASE_URL_DEFAULT = "https://api.crowdin.com";
    public static final String BASE_ENTERPRISE_URL_DEFAULT = "https://%s.crowdin.com";

    private Scanner scanner = new Scanner(System.in, "UTF-8");
    private boolean isEnterprise;
    private boolean withBrowser;

    public static final String LINK = "https://support.crowdin.com/configuration-file/";
    public static final String ENTERPRISE_LINK = "https://support.crowdin.com/enterprise/configuration-file/";

    private Path destinationPath;
    private boolean skipGenerateDescription;

    public GenerateAction(Path destinationPath, boolean skipGenerateDescription) {
        this.destinationPath = destinationPath;
        this.skipGenerateDescription = skipGenerateDescription;
    }

    private Outputter out;

    @Override
    public void act(Outputter out) {
        this.out = out;
        try {
            out.println(String.format(
                RESOURCE_BUNDLE.getString("message.command_generate_description"),
                destinationPath.toAbsolutePath()));
            if (Files.exists(destinationPath)) {
                out.println(ExecutionStatus.SKIPPED.getIcon() + String.format(
                        RESOURCE_BUNDLE.getString("message.already_exists"), destinationPath.toAbsolutePath()));
                return;
            }

            List<String> fileLines = this.readResource("/crowdin.yml");
            if (!skipGenerateDescription) {
                this.updateWithUserInputs(fileLines);
            }
            this.write(destinationPath, fileLines);
            out.println(String.format(
                RESOURCE_BUNDLE.getString("message.generate_successful"),
                this.isEnterprise ? ENTERPRISE_LINK : LINK));

        } catch (Exception e) {
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.create_file"), e);
        }
    }

    private void write(Path path, List<String> fileLines) {
        try {
            Files.write(destinationPath, fileLines);
        } catch (IOException e) {
            throw new RuntimeException(String.format(
                RESOURCE_BUNDLE.getString("error.write_file"), destinationPath.toAbsolutePath()), e);
        }
    }

    private void updateWithUserInputs(List<String> fileLines) {
        Map<String, String> values = new HashMap<>();

        withBrowser = !StringUtils.startsWithAny(ask(
            RESOURCE_BUNDLE.getString("message.ask_auth_via_browser") + ": (Y/n) "), "n", "N", "-");
        if (withBrowser) {
            String token;
            try {
                ConsoleSpinner.start(out, "Waiting for authorization to complete (Press <Ctrl>+C to exit)", false);
                token = OAuthUtil.getToken(OAUTH_CLIENT_ID);
                ConsoleSpinner.stop(OK, "Authorization finished successfully");
            } catch (Exception e) {
                ConsoleSpinner.stop(ERROR, e.getMessage());
                throw e;
            }
            String organizationName = OAuthUtil.getDomainFromToken(token);
            values.put(API_TOKEN, token);
            if (StringUtils.isNotEmpty(organizationName)) {
                values.put(BASE_URL, String.format(BASE_ENTERPRISE_URL_DEFAULT, organizationName));
            } else {
                values.put(BASE_URL, BASE_URL_DEFAULT);
            }
        } else {
            this.isEnterprise = StringUtils.startsWithAny(ask(
                    RESOURCE_BUNDLE.getString("message.ask_is_enterprise") + ": (N/y) "), "y", "Y", "+");
            if (this.isEnterprise) {
                String organizationName = ask(RESOURCE_BUNDLE.getString("message.ask_organization_name") + ": ");
                if (StringUtils.isNotEmpty(organizationName)) {
                    if (PropertiesBeanUtils.isCrowdinUrl(organizationName)) {
                        String realOrganizationName = PropertiesBeanUtils.getOrganization(organizationName);
                        System.out.println(String.format(RESOURCE_BUNDLE.getString("message.exctracted_organization_name"), realOrganizationName));
                        values.put(BASE_URL, String.format(BASE_ENTERPRISE_URL_DEFAULT, realOrganizationName));
                    } else {
                        values.put(BASE_URL, String.format(BASE_ENTERPRISE_URL_DEFAULT, organizationName));
                    }
                } else {
                    this.isEnterprise = false;
                    values.put(BASE_URL, BASE_URL_DEFAULT);
                }
            } else {
                values.put(BASE_URL, BASE_URL_DEFAULT);
            }
            String apiToken = askParam(API_TOKEN);
            if (!apiToken.isEmpty()) {
                values.put(API_TOKEN, apiToken);
            }
        }
        while (true) {
            String projectId = askParam(PROJECT_ID);
            if (projectId.isEmpty()) {
                break;
            } else if (StringUtils.isNumeric(projectId)) {
                values.put(PROJECT_ID, projectId);
                break;
            } else {
                System.out.println(String.format(RESOURCE_BUNDLE.getString("error.init.project_id_is_not_number"), projectId));
            }
        }
        if (values.containsKey(BASE_URL) && values.containsKey(PROJECT_ID) && values.containsKey(API_TOKEN)) {
            this.checkParametersForExistence(values.get(API_TOKEN), values.get(BASE_URL), Long.parseLong(values.get(PROJECT_ID)));
        } else {
            System.out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("error.init.skip_project_validation")));
        }
        String basePath = askWithDefault(RESOURCE_BUNDLE.getString("message.ask_project_directory"), BASE_PATH_DEFAULT);
        File basePathFile = Paths.get(basePath).normalize().toAbsolutePath().toFile();
        if (!basePathFile.exists()) {
            System.out.println(WARNING.withIcon(String.format(RESOURCE_BUNDLE.getString("error.init.path_not_exist"), basePathFile)));
        }
        values.put(BASE_PATH, basePath);

        for (Map.Entry<String, String> entry : values.entrySet()) {
            for (int i = 0; i < fileLines.size(); i++) {
                if (fileLines.get(i).contains(entry.getKey())) {
                    fileLines.set(i, fileLines.get(i).replaceFirst(": \"*\"", String.format(": \"%s\"", entry.getValue())));
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
        out.print(question);
        return scanner.nextLine();
    }

    private void checkParametersForExistence(String apiToken, String baseUrl, Long projectId) {
        Client client = new CrowdinClient(apiToken, baseUrl, projectId);
        try {
            ConsoleSpinner.start(out, RESOURCE_BUNDLE.getString("message.spinner.validating_project"), false);
            client.downloadProjectInfo();
            ConsoleSpinner.stop(OK, RESOURCE_BUNDLE.getString("message.spinner.validation_success"));
        } catch (Exception e) {
            ConsoleSpinner.stop(WARNING, e.getMessage());
        }
    }
}
