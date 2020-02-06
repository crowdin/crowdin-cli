package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.CommandUtils;
import com.crowdin.cli.utils.PlaceholderUtil;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.util.List;
import java.util.stream.Collectors;

public class DryrunTranslations extends Dryrun {

    private PropertiesBean pb;
    private PlaceholderUtil placeholderUtil;

    public DryrunTranslations(PropertiesBean pb, PlaceholderUtil placeholderUtil) {
        this.pb = pb;
        this.placeholderUtil = placeholderUtil;
    }

    @Override
    protected List<String> getFiles() {
        return pb.getFiles()
            .stream()
            .flatMap(file -> CommandUtils.getFileSourcesWithoutIgnores(file, pb.getBasePath(), placeholderUtil)
                .stream()
                .map(source -> placeholderUtil.replaceFileDependentPlaceholders(file.getTranslation(), source))
                .flatMap(translation -> ((file.getLanguagesMapping() != null)
                    ? placeholderUtil.replaceLanguageDependentPlaceholders(translation, file.getLanguagesMapping())
                    : placeholderUtil.replaceLanguageDependentPlaceholders(translation)).stream()))
            .map(source -> StringUtils.removeStart(source, pb.getBasePath()))
            .collect(Collectors.toList());
    }
}
