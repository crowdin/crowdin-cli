package com.crowdin.cli.client;

import com.crowdin.cli.utils.CacheUtil;
import com.crowdin.client.CrowdinRequestBuilder;
import com.crowdin.client.api.DirectoriesApi;
import com.crowdin.common.Settings;
import com.crowdin.common.models.Directory;
import com.crowdin.common.models.Pageable;
import com.crowdin.common.response.Page;
import com.crowdin.util.PaginationUtil;
import org.apache.commons.lang3.tuple.Pair;

import java.util.List;
import java.util.Optional;

public class DirectoryClient extends Client {

    private static final String CACHE_NAME = "directory";

    private DirectoriesApi api = new DirectoriesApi(settings);

    public DirectoryClient(Settings settings) {
        super(settings);
    }

    public Optional<Directory> getProjectBranchByName(Long projectId, String name) {
        Directory directory = CacheUtil.computeIfAbsent(
                CACHE_NAME,
                Pair.of(projectId, name),
                key -> {
                    CrowdinRequestBuilder<Page<Directory>> directoriesApi = api.getProjectDirectories(projectId.toString(), Pageable.unpaged());
                    List<Directory> directories = PaginationUtil.unpaged(directoriesApi);
                    return directories
                            .stream()
                            .filter(d -> d.getName().equalsIgnoreCase(name))
                            .findFirst()
                            .orElse(null);
                }
        );
        return Optional.ofNullable(directory);
    }
}
