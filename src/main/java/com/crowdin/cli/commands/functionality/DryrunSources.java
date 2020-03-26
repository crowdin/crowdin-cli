package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.utils.PlaceholderUtil;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
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
        List<String> files = pb.getFiles().stream()
            .flatMap(file -> SourcesUtils.getFiles(pb.getBasePath(), file.getSource(), file.getIgnore(), placeholderUtil)
            .map(File::getAbsolutePath))
            .collect(Collectors.toList());

        String commonPath = (pb.getPreserveHierarchy()) ? "" : SourcesUtils.getCommonPath(files, pb.getBasePath());

        return files.stream()
            .map(source -> StringUtils.removeStart(source, pb.getBasePath()))
            .map(source -> StringUtils.removeStart(source, commonPath))
            .collect(Collectors.toList());
    }
}
