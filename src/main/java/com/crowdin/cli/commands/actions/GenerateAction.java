package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.Clients;
import com.crowdin.cli.client.NoClient;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.FilesInterface;
import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.commands.picocli.ExitCodeExceptionMapper;
import com.crowdin.cli.properties.NoProperties;
import com.crowdin.cli.utils.Utils;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.cli.utils.http.OAuthUtil;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

import static com.crowdin.cli.BaseCli.OAUTH_CLIENT_ID;
import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.properties.PropertiesBuilder.*;
import static com.crowdin.cli.utils.console.ExecutionStatus.ERROR;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;
import static java.lang.Boolean.TRUE;
import static java.util.Objects.isNull;
import static java.util.Objects.nonNull;

@RequiredArgsConstructor
class GenerateAction implements NewAction<NoProperties, NoClient> {

    public static final String BASE_PATH_DEFAULT = ".";
    public static final String BASE_URL_DEFAULT = "https://api.crowdin.com";
    public static final String BASE_ENTERPRISE_URL_DEFAULT = "https://%s.api.crowdin.com";

    private boolean isEnterprise;
    private boolean withBrowser;

    private final FilesInterface files;
    private final String token;
    private final String baseUrl;
    private final String basePath;
    private final String projectId;
    private final String source;
    private final String translation;
    private final Boolean preserveHierarchy;
    private final Path destinationPath;
    private final boolean skipGenerateDescription;

    @Override
    public void act(Outputter out, NoProperties noProperties, NoClient noClient) {
        Scanner scanner = new Scanner(System.in, "UTF-8");
        Asking asking = new Asking(out, scanner);
        try {
            out.println(String.format(
                RESOURCE_BUNDLE.getString("message.command_generate_description"),
                destinationPath.toAbsolutePath()));
            if (Files.exists(destinationPath)) {
                out.println(ExecutionStatus.SKIPPED.getIcon() + String.format(
                        RESOURCE_BUNDLE.getString("message.already_exists"), destinationPath.toAbsolutePath()));
                return;
            }

            List<String> fileLines = Utils.readResource("/crowdin.yml");
            if (!skipGenerateDescription) {
                this.updateWithUserInputs(out, asking, fileLines);
            }
            files.writeToFile(
                destinationPath.toString(), new ByteArrayInputStream(StringUtils.join(fileLines, "\n").getBytes(StandardCharsets.UTF_8)));

            out.println(String.format(RESOURCE_BUNDLE.getString("message.generate_successful")));
        } catch (Exception e) {
            throw ExitCodeExceptionMapper.remap(e, RESOURCE_BUNDLE.getString("error.create_file"));
        }
    }

    private void updateWithUserInputs(Outputter out, Asking asking, List<String> fileLines) {
        Map<String, String> values = new HashMap<>();
        setGivenParams(values);

        withBrowser = isNull(token) && !StringUtils.startsWithAny(asking.ask(
            RESOURCE_BUNDLE.getString("message.ask_auth_via_browser") + ": (Y/n) "), "n", "N", "-");
        if (withBrowser) {
            String token;
            try {
                ConsoleSpinner.start(out, "Waiting for authorization to complete (Press <Ctrl>+C to exit)", false);
                token = OAuthUtil.getToken(out, OAUTH_CLIENT_ID);
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
            if (isNull(baseUrl)) {
                this.isEnterprise = StringUtils.startsWithAny(asking.ask(
                    RESOURCE_BUNDLE.getString("message.ask_is_enterprise") + ": (N/y) "), "y", "Y", "+");
                if (this.isEnterprise) {
                    String organizationName = asking.ask(RESOURCE_BUNDLE.getString("message.ask_organization_name") + ": ");
                    if (StringUtils.isNotEmpty(organizationName)) {
                        if (PropertiesBeanUtils.isUrlValid(organizationName)) {
                            String realOrganizationName = PropertiesBeanUtils.getOrganization(organizationName);
                            System.out.println(String.format(RESOURCE_BUNDLE.getString("message.extracted_organization_name"), realOrganizationName));
                            values.put(BASE_URL, String.format(BASE_ENTERPRISE_URL_DEFAULT, realOrganizationName));
                        } else {
                            values.put(BASE_URL, String.format(BASE_ENTERPRISE_URL_DEFAULT, PropertiesBeanUtils.getOrganization(organizationName)));
                        }
                    } else {
                        this.isEnterprise = false;
                        values.put(BASE_URL, BASE_URL_DEFAULT);
                    }
                } else {
                    values.put(BASE_URL, BASE_URL_DEFAULT);
                }
            }
            if (isNull(token)) {
                String apiToken = asking.askParam(API_TOKEN);
                if (!apiToken.isEmpty()) {
                    values.put(API_TOKEN, apiToken);
                }
            }
        }
        boolean projectIdSpecified = nonNull(projectId);
        while (true) {
            String projectIdToSet = projectIdSpecified ? projectId : asking.askParam(PROJECT_ID);
            if (projectIdToSet.isEmpty()) {
                break;
            } else if (StringUtils.isNumeric(projectIdToSet)) {
                values.put(PROJECT_ID, projectIdToSet);
                break;
            } else {
                projectIdSpecified = false;
                values.remove(PROJECT_ID);
                System.out.println(String.format(RESOURCE_BUNDLE.getString("error.init.project_id_is_not_number"), projectId));
            }
        }
        if (values.containsKey(BASE_URL) && values.containsKey(PROJECT_ID) && values.containsKey(API_TOKEN)) {
            this.checkParametersForExistence(out, values.get(API_TOKEN), values.get(BASE_URL), Long.parseLong(values.get(PROJECT_ID)));
        } else {
            System.out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("error.init.skip_project_validation")));
        }
        String basePathToSet = nonNull(basePath) ? basePath : asking.askWithDefault(RESOURCE_BUNDLE.getString("message.ask_project_directory"), BASE_PATH_DEFAULT);
        java.io.File basePathFile = Paths.get(basePathToSet).normalize().toAbsolutePath().toFile();
        if (!basePathFile.exists()) {
            System.out.println(WARNING.withIcon(String.format(RESOURCE_BUNDLE.getString("error.init.path_not_exist"), basePathFile)));
        }
        values.put(BASE_PATH, basePathToSet);

        for (Map.Entry<String, String> entry : values.entrySet()) {
            for (int i = 0; i < fileLines.size(); i++) {
                String keyToSearch = String.format("\"%s\"", entry.getKey());
                if (fileLines.get(i).contains(keyToSearch)) {
                    String updatedLine = PRESERVE_HIERARCHY.equals(entry.getKey()) ?
                        fileLines.get(i).replace(String.valueOf(TRUE), entry.getValue())
                        : fileLines.get(i).replaceFirst(": \"*\"", String.format(": \"%s\"", Utils.regexPath(entry.getValue())));
                    fileLines.set(i, updatedLine);
                    break;
                }
            }
        }
    }

    private void setGivenParams(Map<String, String> values) {
        Optional.ofNullable(token).ifPresent(v -> values.put(API_TOKEN, token));
        Optional.ofNullable(baseUrl).ifPresent(v -> values.put(BASE_URL, baseUrl));
        Optional.ofNullable(basePath).ifPresent(v -> values.put(BASE_PATH, basePath));
        Optional.ofNullable(projectId).ifPresent(v -> values.put(PROJECT_ID, projectId));
        Optional.ofNullable(source).ifPresent(v ->  values.put(SOURCE, source));
        Optional.ofNullable(translation).ifPresent(v -> values.put(TRANSLATION, translation));
        Optional.ofNullable(preserveHierarchy).ifPresent(v -> values.put(PRESERVE_HIERARCHY, String.valueOf(preserveHierarchy)));
    }

    public static class Asking {

        private Outputter out;
        private Scanner scanner;

        public Asking(Outputter out, Scanner scanner) {
            this.out = out;
            this.scanner = scanner;
        }

        public String askParam(String key) {
            return ask(StringUtils.capitalize(key.replaceAll("_", " ")) + ": ");
        }

        public String askWithDefault(String question, String def) {
            String input = ask(question + ": (" + def + ") ");
            return StringUtils.isNotEmpty(input) ? input : def;
        }

        public String ask(String question) {
            out.print(question);
            return scanner.nextLine();
        }
    }

    private void checkParametersForExistence(Outputter out, String apiToken, String baseUrl, Long projectId) {
        ProjectClient client = Clients.getProjectClient(apiToken, baseUrl, projectId);
        try {
            ConsoleSpinner.start(out, RESOURCE_BUNDLE.getString("message.spinner.validating_project"), false);
            client.downloadProjectInfo();
            ConsoleSpinner.stop(OK, RESOURCE_BUNDLE.getString("message.spinner.validation_success"));
        } catch (Exception e) {
            ConsoleSpinner.stop(WARNING, e.getMessage());
        }
    }
}
