package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.ClientAction;
import com.crowdin.cli.commands.functionality.FsFiles;
import com.crowdin.client.core.model.Format;
import org.apache.commons.io.FilenameUtils;
import picocli.CommandLine;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

@CommandLine.Command(
    name = CommandNames.GLOSSARY_DOWNLOAD
)
public class GlossaryDownloadSubcommand extends ClientActCommand {

    @CommandLine.Option(names = {"--id"}, paramLabel = "...")
    private Long id;

    @CommandLine.Option(names = {"--name"}, paramLabel = "...")
    private String name;

    @CommandLine.Option(names = {"--format"}, paramLabel = "...")
    private Format format;

    @CommandLine.Option(names = "--to", paramLabel = "...")
    private File to;

    @Override
    protected ClientAction getAction(Actions actions) {
        return actions.glossaryDownload(id, name, format, noProgress, to, new FsFiles());
    }

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();
        if (to != null && format == null) {
            String extension = FilenameUtils.getExtension(to.getName());
            try {
                format = Format.from(extension);
            } catch (IllegalArgumentException e) {
                errors.add(RESOURCE_BUNDLE.getString("error.glossary.wrong_format"));
            }
        }
        if (id != null && name != null) {
            errors.add(RESOURCE_BUNDLE.getString("error.glossary.id_and_name"));
        } else if (id == null && name == null) {
            errors.add(RESOURCE_BUNDLE.getString("error.glossary.no_id_and_no_name"));
        }
        return errors;
    }
}
