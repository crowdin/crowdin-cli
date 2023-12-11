package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientTm;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.functionality.FsFiles;
import com.crowdin.cli.properties.BaseProperties;
import com.crowdin.client.translationmemory.model.TranslationMemoryFormat;
import org.apache.commons.io.FilenameUtils;
import picocli.CommandLine;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

@CommandLine.Command(
    name = CommandNames.TM_DOWNLOAD,
    sortOptions = false
)
class TmDownloadSubcommand extends ActCommandTm {

    @CommandLine.Option(names = {"--id"}, paramLabel = "...", order = -2)
    private Long id;

    @CommandLine.Option(names = {"--name"}, paramLabel = "...", order = -2)
    private String name;

    @CommandLine.Option(names = {"--source-language-id"}, paramLabel = "...", order = -2)
    private String sourceLanguageId;

    @CommandLine.Option(names = {"--target-language-id"}, paramLabel = "...", order = -2)
    private String targetLanguageId;

    @CommandLine.Option(names = {"--format"}, paramLabel = "...", order = -2)
    private TranslationMemoryFormat format;

    @CommandLine.Option(names = "--to", paramLabel = "...", order = -2)
    private File to;

    @Override
    protected NewAction<BaseProperties, ClientTm> getAction(Actions actions) {
        return actions.tmDownload(id, name, format, sourceLanguageId, targetLanguageId, noProgress, to, new FsFiles());
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
        if (sourceLanguageId != null && targetLanguageId == null) {
            errors.add(RESOURCE_BUNDLE.getString("error.tm.target_language_id_is_null"));
        } else if (sourceLanguageId == null && targetLanguageId != null) {
            errors.add(RESOURCE_BUNDLE.getString("error.tm.source_language_id_is_null"));
        }
        return errors;
    }
}
