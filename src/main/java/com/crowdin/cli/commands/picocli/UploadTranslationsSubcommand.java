package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.Client;
import com.crowdin.cli.client.CrowdinClient;
import com.crowdin.cli.commands.actions.Action;
import com.crowdin.cli.commands.actions.ListTranslationsAction;
import com.crowdin.cli.commands.actions.UploadTranslationsAction;
import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.properties.PropertiesBean;
import picocli.CommandLine;

@CommandLine.Command(
    name ="translations",
    sortOptions = false
)
public class UploadTranslationsSubcommand extends Command {

    @CommandLine.Option(names = {"--auto-approve-imported"}, negatable = true)
    protected boolean autoApproveImported;

    @CommandLine.Option(names = {"--import-duplicates"}, negatable = true)
    protected boolean importDuplicates;

    @CommandLine.Option(names = {"--import-eq-suggestions"}, negatable = true)
    protected boolean importEqSuggestions;

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...")
    protected String branch;

    @CommandLine.Option(names = {"-l", "--language"}, paramLabel = "...")
    protected String languageId;

    @CommandLine.Option(names = {"--dryrun"})
    protected boolean dryrun;

    @CommandLine.Option(names = {"--tree"}, descriptionKey = "tree.dryrun")
    protected boolean treeView;

    @CommandLine.Mixin
    private PropertiesBuilderCommandPart propertiesBuilderCommandPart;

    @Override
    public void run() {
        PropertiesBean pb = propertiesBuilderCommandPart.buildPropertiesBean();
        Client client = new CrowdinClient(pb.getApiToken(), pb.getBaseUrl(), Long.parseLong(pb.getProjectId()));

        Action action = (dryrun)
            ? new ListTranslationsAction(noProgress, treeView)
            : new UploadTranslationsAction(noProgress, languageId, branch, importDuplicates, importEqSuggestions, autoApproveImported);
        action.act(pb, client);
    }
}
