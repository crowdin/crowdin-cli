package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.CrowdinClient;
import com.crowdin.cli.commands.actions.Action;
import com.crowdin.cli.commands.actions.StringListAction;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.Utils;
import org.apache.commons.lang3.StringUtils;
import picocli.CommandLine;

@CommandLine.Command(
    name = "list"
)
public class StringListSubcommand extends Command {

    @CommandLine.Option(names = {"--file"})
    protected String file;

    @CommandLine.Option(names = {"--filter"})
    protected String filter;

    @CommandLine.Mixin
    private PropertiesBuilderCommandPart propertiesBuilderCommandPart;

    @Override
    public void run() {
        checkOptions();

        PropertiesBean pb = propertiesBuilderCommandPart.buildPropertiesBean();
        Client client = new CrowdinClient(pb.getApiToken(), pb.getBaseUrl(), Long.parseLong(pb.getProjectId()));

        Action action = new StringListAction(noProgress, isVerbose, file, filter);
        action.act(pb, client);
    }

    private void checkOptions() {
        if (file != null) {
            file = StringUtils.removeStart(Utils.normalizePath(file), Utils.PATH_SEPARATOR);
        }
    }
}
