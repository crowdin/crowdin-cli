package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientGlossary;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.BaseProperties;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;
import picocli.CommandLine;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@CommandLine.Command(
    name = CommandNames.GLOSSARY_UPLOAD,
    sortOptions = false
)
class GlossaryUploadSubcommand extends ActCommandGlossary {

    @CommandLine.Parameters(descriptionKey = "crowdin.glossary.upload.file")
    private File file;

    @CommandLine.Option(names = {"--id"}, paramLabel = "...", order = -2)
    private Long id;

    @CommandLine.Option(names = {"--name"}, paramLabel = "...", order = -2)
    private String name;

    @CommandLine.Option(names = {"--language"}, paramLabel = "...", descriptionKey = "crowdin.glossary.upload.language-id", order = -2)
    private String languageId;

    @CommandLine.Option(names = {"--scheme"}, paramLabel = "...", order = -2)
    private Map<String, Integer> scheme;

    @CommandLine.Option(names = {"--first-line-contains-header"}, order = -2)
    private Boolean firstLineContainsHeader;

    @Override
    protected NewAction<BaseProperties, ClientGlossary> getAction(Actions actions) {
        return actions.glossaryUpload(file, id, name, languageId, scheme, firstLineContainsHeader);
    }

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();
        if (!file.exists()) {
            errors.add(String.format("File '%s' doesn't exist", file));
        }
        if (!equalsAny(FilenameUtils.getExtension(file.getName()), "tbx", "csv", "xls", "xlsx")) {
            errors.add(RESOURCE_BUNDLE.getString("error.glossary.wrong_format"));
        }
        if (!equalsAny(FilenameUtils.getExtension(file.getName()), "csv", "xls", "xlsx") && scheme != null) {
            errors.add(RESOURCE_BUNDLE.getString("error.glossary.scheme_and_wrong_format"));
        } else if (equalsAny(FilenameUtils.getExtension(file.getName()), "csv", "xls", "xlsx") && scheme == null) {
            errors.add(RESOURCE_BUNDLE.getString("error.glossary.scheme_is_required"));
        }
        if (!equalsAny(FilenameUtils.getExtension(file.getName()), "csv", "xls", "xlsx") && firstLineContainsHeader != null) {
            errors.add(RESOURCE_BUNDLE.getString("error.glossary.first_line_contains_header_and_wrong_format"));
        }
        if (id != null && name != null) {
            errors.add(RESOURCE_BUNDLE.getString("error.glossary.id_and_name"));
        }
        if (id == null && name == null && languageId == null) {
            errors.add(RESOURCE_BUNDLE.getString("error.glossary.no_language_id"));
        }
        return errors;
    }

    private boolean equalsAny(String toCheck, String... strings) {
        for (String string : strings) {
            if (StringUtils.equalsIgnoreCase(toCheck, string)) {
                return true;
            }
        }
        return false;
    }
}
