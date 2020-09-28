package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.ClientAction;
import com.crowdin.cli.commands.functionality.FsFiles;
import com.crowdin.client.translationmemory.model.TranslationMemoryFormat;
import org.apache.commons.io.FilenameUtils;
import picocli.CommandLine;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

@CommandLine.Command(
    name = CommandNames.TM_DOWNLOAD
)
class TmDownloadSubcommand extends ClientActCommand {

    @CommandLine.Option(names = {"--id"}, paramLabel = "...")
    private Long id;

    @CommandLine.Option(names = {"--name"}, paramLabel = "...")
    private String name;

    @CommandLine.Option(names = {"--source-language-id"}, paramLabel = "...")
    private String sourceLanguageId;

    @CommandLine.Option(names = {"--target-language-id"}, paramLabel = "...")
    private String targetLanguageid;

    @CommandLine.Option(names = {"--format"}, paramLabel = "...")
    private TranslationMemoryFormat format;

    @CommandLine.Option(names = "--to", paramLabel = "...")
    private File to;

    @Override
    protected ClientAction getAction(Actions actions) {
        return actions.tmDownload(id, name, format, sourceLanguageId, targetLanguageid, noProgress, to, new FsFiles());
    }

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();
        if (to != null && format == null) {
            String extension = FilenameUtils.getExtension(to.getName());
            try {
                format = TranslationMemoryFormat.from(extension);
            } catch (IllegalArgumentException e) {
                errors.add(RESOURCE_BUNDLE.getString("error.tm.wrong_format"));
            }
        }
        if (id != null && name != null) {
            errors.add(RESOURCE_BUNDLE.getString("error.tm.id_and_name"));
        } else if (id == null && name == null) {
            errors.add(RESOURCE_BUNDLE.getString("error.tm.no_id_and_no_name"));
        }
        if (sourceLanguageId != null && targetLanguageid == null) {
            errors.add(RESOURCE_BUNDLE.getString("error.tm.target_language_id_is_null"));
        } else if (sourceLanguageId == null && targetLanguageid != null) {
            errors.add(RESOURCE_BUNDLE.getString("error.tm.source_language_id_is_null"));
        }
        return errors;
    }
}
