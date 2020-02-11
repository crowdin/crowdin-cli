package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.CommandUtils;
import com.crowdin.cli.utils.PlaceholderUtil;
import org.apache.commons.lang3.StringUtils;

import java.util.List;
import java.util.stream.Collectors;

public class DryrunSources extends Dryrun {

    private PropertiesBean pb;
    private PlaceholderUtil placeholderUtil;

    public DryrunSources(PropertiesBean pb, PlaceholderUtil placeholderUtil) {
        this.pb = pb;
        this.placeholderUtil = placeholderUtil;
    }

    @Override
    protected List<String> getFiles() {
        List<String> files = pb
            .getFiles()
            .stream()
            .flatMap(file -> CommandUtils.getSourcesWithoutIgnores(file, pb.getBasePath(), placeholderUtil).stream())
            .map(source -> StringUtils.removeStart(source, pb.getBasePath()))
            .collect(Collectors.toList());

        String commonPath =
            (pb.getPreserveHierarchy()) ? "" : CommandUtils.getCommonPath(files);

        return files.stream()
            .map(source -> StringUtils.removeStart(source, commonPath))
            .collect(Collectors.toList());
    }
}
