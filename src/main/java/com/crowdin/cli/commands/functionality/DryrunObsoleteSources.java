package com.crowdin.cli.commands.functionality;

import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.PlaceholderUtil;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.sourcefiles.model.Directory;
import com.crowdin.client.sourcefiles.model.File;
import lombok.NonNull;
import org.apache.commons.lang3.StringUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class DryrunObsoleteSources extends Dryrun {

    private PropertiesWithFiles pb;
    private PlaceholderUtil placeholderUtil;
    private Map<Long, Directory> directories;
    private List<File> files;

    public DryrunObsoleteSources(@NonNull PropertiesWithFiles pb, @NonNull PlaceholderUtil placeholderUtil, @NonNull Map<Long, Directory> directories, @NonNull List<File> files) {
        super("message.obsolete_file");
        this.pb = pb;
        this.placeholderUtil = placeholderUtil;
        this.directories = directories;
        this.files = files;
    }

    @Override
    protected List<String> getFiles() {
        Map<String, com.crowdin.client.sourcefiles.model.File> projectFiles = ProjectFilesUtils.buildFilePaths(directories, files);
        List<String> obsoleteFilesResult = new ArrayList<>();
        for (FileBean file : pb.getFiles()) {
            List<String> sources = SourcesUtils.getFiles(pb.getBasePath(), file.getSource(), file.getIgnore(), placeholderUtil)
                .map(java.io.File::getAbsolutePath)
                .collect(Collectors.toList());
            String commonPath =
                (pb.getPreserveHierarchy()) ? "" : SourcesUtils.getCommonPath(sources, pb.getBasePath());
            List<String> filesToUpdate = sources.stream()
                .map(source -> (file.getDest() != null)
                    ? PropertiesBeanUtils.prepareDest(file.getDest(), StringUtils.removeStart(source, pb.getBasePath()), placeholderUtil)
                    : StringUtils.removeStart(source, pb.getBasePath() + commonPath))
                .map(Utils::noSepAtStart)
                .collect(Collectors.toList());

            String pattern = (file.getDest() != null) ? file.getDest() : file.getSource();
            if (file.getDest() != null) {
                pattern = PropertiesBeanUtils.prepareDest(file.getDest(), StringUtils.removeStart(file.getSource(), pb.getBasePath()), placeholderUtil);
            }
            List<String> ignorePatterns = (file.getDest() != null) ? null : file.getIgnore();

            Map<String, File> obsoleteFiles = ObsoleteSourcesUtils.findObsoleteProjectFiles(projectFiles, pb.getPreserveHierarchy(), filesToUpdate, pattern, file.getTranslation(), ignorePatterns);
            obsoleteFilesResult.addAll(obsoleteFiles.keySet());
        }

        return obsoleteFilesResult;
    }
}
