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

        List<File> files = pb
            .getFiles()
            .stream()
            .flatMap(file -> CommandUtils.getSourcesWithoutIgnores(file, pb.getBasePath(), placeholderUtil).stream())
            .map(source -> StringUtils.removeStart(source, pb.getBasePath()))
            .map(File::new)
            .collect(Collectors.toList());

        return pb.getFiles()
            .stream()
            .flatMap(fileBean -> placeholderUtil.format(files, fileBean.getTranslation(), true).stream())
            .collect(Collectors.toList());
    }
}
