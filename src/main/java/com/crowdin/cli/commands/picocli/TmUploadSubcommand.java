package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientTm;
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
    name = CommandNames.TM_UPLOAD,
    sortOptions = false
)
class TmUploadSubcommand extends ActCommandTm {

    @CommandLine.Parameters(descriptionKey = "crowdin.tm.upload.file")
    private File file;

    @CommandLine.Option(names = {"--id"}, paramLabel = "...", descriptionKey = "crowdin.tm.upload.id", order = -2)
    private Long id;

    @CommandLine.Option(names = {"--language"}, paramLabel = "...", descriptionKey = "crowdin.tm.upload.language-id", order = -2)
    private String languageId;

    @CommandLine.Option(names = {"--scheme"}, paramLabel = "...", descriptionKey = "crowdin.tm.upload.scheme", order = -2)
    private Map<String, Integer> scheme;

    @CommandLine.Option(names = {"--first-line-contains-header"}, descriptionKey = "crowdin.tm.upload.first-line-contains-header", order = -2)
    private Boolean firstLineContainsHeader;

    @Override
    protected NewAction<BaseProperties, ClientTm> getAction(Actions actions) {
        return actions.tmUpload(file, id, languageId, scheme, firstLineContainsHeader);
    }

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();
        String extension = FilenameUtils.getExtension(file.getName());
        if (scheme == null && ("csv".equalsIgnoreCase(extension) || "xslx".equalsIgnoreCase(extension))) {
            errors.add(RESOURCE_BUNDLE.getString("error.tm.scheme_is_required"));
        }
        if (!equalsAny(FilenameUtils.getExtension(file.getName()), "tmx", "csv", "xls", "xlsx")) {
            errors.add(RESOURCE_BUNDLE.getString("error.tm.wrong_format"));
        }
        if (!equalsAny(FilenameUtils.getExtension(file.getName()), "csv", "xls", "xlsx") && firstLineContainsHeader != null) {
            errors.add(RESOURCE_BUNDLE.getString("error.tm.first_line_contains_header_and_wrong_format"));
        }
        if (id == null && languageId == null) {
            errors.add(RESOURCE_BUNDLE.getString("error.tm.no_language_id"));
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
