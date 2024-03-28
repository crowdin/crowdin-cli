package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientGlossary;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.functionality.FsFiles;
import com.crowdin.cli.properties.BaseProperties;
import com.crowdin.client.glossaries.model.GlossariesFormat;
import org.apache.commons.io.FilenameUtils;
import picocli.CommandLine;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

@CommandLine.Command(
    name = CommandNames.GLOSSARY_DOWNLOAD,
    sortOptions = false
)
class GlossaryDownloadSubcommand extends ActCommandGlossary {

    @CommandLine.Parameters(descriptionKey = "crowdin.glossary.download.id")
    protected Long id;

    @CommandLine.Option(names = {"--format"}, paramLabel = "...", order = -2)
    private GlossariesFormat format;

    @CommandLine.Option(names = "--to", paramLabel = "...", order = -2)
    private File to;

    @Override
    protected NewAction<BaseProperties, ClientGlossary> getAction(Actions actions) {
        return actions.glossaryDownload(id, format, noProgress, to, new FsFiles());
    }

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();
        if (to != null && format == null) {
            String extension = FilenameUtils.getExtension(to.getName());
            try {
                format = GlossariesFormat.from(extension);
            } catch (IllegalArgumentException e) {
                errors.add(RESOURCE_BUNDLE.getString("error.glossary.wrong_format"));
            }
        }
        return errors;
    }
}
