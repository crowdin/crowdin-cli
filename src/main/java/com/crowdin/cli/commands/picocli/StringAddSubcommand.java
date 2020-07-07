package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.CrowdinClient;
import com.crowdin.cli.commands.actions.Action;
import com.crowdin.cli.commands.actions.StringAddAction;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.Utils;
import org.apache.commons.lang3.StringUtils;
import picocli.CommandLine;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@CommandLine.Command(
    sortOptions = false,
    name = "add"
)
public class StringAddSubcommand extends Command {

    @CommandLine.Parameters(descriptionKey = "crowdin.string.add.text")
    protected String text;

    @CommandLine.Option(names = {"--identifier"}, paramLabel = "...")
    protected String identifier;

    @CommandLine.Option(names = {"--max-length"}, paramLabel = "...")
    protected Integer maxLength;

    @CommandLine.Option(names = {"--context"}, paramLabel = "...")
    protected String context;

    @CommandLine.Option(names = {"--file"}, paramLabel = "...")
    protected String[] files;

    @CommandLine.Option(names = {"--hidden"})
    protected Boolean isHidden;

    @CommandLine.Mixin
    private PropertiesBuilderCommandPart propertiesBuilderCommandPart;

    @Override
    public void run() {
        checkOptions();

        PropertiesBean pb = propertiesBuilderCommandPart.buildPropertiesBean();
        Client client = new CrowdinClient(pb.getApiToken(), pb.getBaseUrl(), Long.parseLong(pb.getProjectId()));

        Action action = new StringAddAction(noProgress, text, identifier, maxLength, context, files, isHidden);
        action.act(pb, client);
    }

    private void checkOptions() {
        List<String> errors = new ArrayList();
        if (maxLength != null && maxLength < 0) {
            errors.add("'--max-len' cannot be lower than 0");
        }
        if (files != null) {
            for (int i = 0; i < files.length; i++) {
                String normalizedFile = StringUtils.removeStart(Utils.normalizePath(files[i]), Utils.PATH_SEPARATOR);
                files[i] = normalizedFile;
            }
        }
        if (!errors.isEmpty()) {
            String errorsInOne = errors.stream()
                .map(error -> String.format(RESOURCE_BUNDLE.getString("message.item_list"), error))
                .collect(Collectors.joining("\n"));
            throw new RuntimeException(RESOURCE_BUNDLE.getString("error.params_are_invalid")+"\n" + errorsInOne);
        }
    }
}
