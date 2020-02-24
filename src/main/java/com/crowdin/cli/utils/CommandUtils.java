package com.crowdin.cli.utils;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.DirectoriesClient;
import com.crowdin.cli.client.exceptions.ExistsResponseException;
import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.cli.client.exceptions.WaitResponseException;
import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.properties.helper.FileHelper;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.common.models.Branch;
import com.crowdin.common.models.Directory;
import com.crowdin.common.models.Language;
import com.crowdin.common.request.DirectoryPayload;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;

import java.io.File;
import java.nio.file.Files;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Function;

public class CommandUtils extends BaseCli {

    private static final String USER_HOME = "user.home";

    public boolean isSourceContainsPattern(String source) {
        if (source == null) {
            return false;
        }
        return source.contains("**")
                || source.contains("*")
                || source.contains("?")
                || (source.contains("[") && source.contains("]"))
                || (source.contains("\\") && !Utils.isWindows());
    }

    public String replaceDoubleAsteriskInTranslation(String translations, String sources, String source, String basePath) {
        if (StringUtils.isAnyEmpty(translations, sources)) {
            throw new RuntimeException("No sources and/or translations");
        }
        if (!translations.contains("**")) {
            return translations;
        }
        sources = Utils.replaceBasePath(sources, basePath);
        String replacement = "";
        if (!source.contains("**")) {
            return translations;
        }
        source = StringUtils.replacePattern(source, "[\\\\/]+", "/");
        sources = StringUtils.replacePattern(sources, "[\\\\/]+", "/");

        String[] sourceNodes = source.split("\\*\\*");
        for (int i = 0; i < sourceNodes.length; i++) {
            if (sources.contains(sourceNodes[i])) {
                sources = sources.replaceFirst(sourceNodes[i], "");
            } else if (sourceNodes.length - 1 == i) {
                if (sourceNodes[i].contains("/")) {
                    String[] sourceNodesTmp = sourceNodes[i].split("/");
                    for (String sourceNode : sourceNodesTmp) {
                        String s = "/" + sourceNode + "/";
                        s = s.replaceAll("/+", "/");
                        if (sources.contains(s)) {
                            sources = sources.replaceFirst(s, "/");
                        } else if (StringUtils.indexOfAny(s, new String[]{"*", "?", "[", "]", "."}) >= 0) {
                            if (sources.lastIndexOf("/") > 0) {
                                sources = sources.substring(0, sources.lastIndexOf("/"));
                            } else {
                                sources = "";
                            }
                        }
                    }
                } else if (sources.contains(".")) {
                    sources = "";
                }
            }
        }
        replacement = sources;
        translations = translations.replace("**", replacement);
        translations = translations.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);
        return translations;
    }

    public static List<String> getSourcesWithoutIgnores(FileBean file, String basePath, PlaceholderUtil placeholderUtil) {
        List<File> sourcesWithoutIgnores = getFileSourcesWithoutIgnores(file, basePath, placeholderUtil);

        List<String> result = new ArrayList<>();
        if (sourcesWithoutIgnores != null) {
            for (File source : sourcesWithoutIgnores) {
                if (source.isFile() || Files.isSymbolicLink(source.toPath())) {
                    result.add(source.getAbsolutePath());
                }
            }
        }
        return result;
    }

    public static List<File> getFileSourcesWithoutIgnores(FileBean file, String basePath, PlaceholderUtil placeholderUtil) {
        if (file == null) {
            return Collections.emptyList();
        }
        FileHelper fileHelper = new FileHelper(basePath);
        List<File> sources = fileHelper.getFileSource(file.getSource());
        List<String> formattedIgnores = placeholderUtil.format(sources, file.getIgnore(), false);
        return fileHelper.filterOutIgnoredFiles(sources, formattedIgnores);
    }


    private Map<String, Long> directoryIdMap = new ConcurrentHashMap<>();
    private Map<Long, Branch> branchNameMap = new ConcurrentHashMap<>();
    private final Map<String, Lock> pathLocks = new ConcurrentHashMap<>();

    public void addDirectoryIdMap(Map<String, Long> directoryIdMap, Map<Long, Branch> branchNameMap) {
        this.directoryIdMap.putAll(directoryIdMap);
        this.branchNameMap.putAll(branchNameMap);
    }

    /**
     * return deepest directory id
     */
    public Long createPath(String filePath, Optional<Long> branchId, DirectoriesClient directoriesClient) {
        String[] nodes = filePath.split(Utils.PATH_SEPARATOR_REGEX);

        Long directoryId = null;
        StringBuilder parentPath = new StringBuilder();
        String branchPath = (branchId.map(branch -> branchNameMap.get(branch).getName() + Utils.PATH_SEPARATOR).orElse(""));
        for (String node : nodes) {
            if (StringUtils.isEmpty(node) || node.equals(nodes[nodes.length - 1])) {
                continue;
            }
            parentPath.append(node).append(Utils.PATH_SEPARATOR);
            String parentPathString = branchPath + parentPath.toString();
            if (directoryIdMap.containsKey(parentPathString)) {
                directoryId = directoryIdMap.get(parentPathString);
            } else {
                DirectoryPayload directoryPayload = new DirectoryPayload();
                directoryPayload.setName(node);

                if (directoryId == null) {
                    branchId.ifPresent(directoryPayload::setBranchId);
                } else {
                    directoryPayload.setDirectoryId(directoryId);
                }
                directoryId = createDirectory(directoriesClient, directoryPayload, parentPathString);
            }
        }
        return directoryId;
    }

    private Long createDirectory(DirectoriesClient directoriesClient, DirectoryPayload directoryPayload, String path) {
        Lock lock;
        synchronized (pathLocks) {
            if (!pathLocks.containsKey(path)) {
                pathLocks.put(path, new ReentrantLock());
            }
            lock = pathLocks.get(path);
        }
        Long directoryId;
        try {
            lock.lock();
            if (directoryIdMap.containsKey(path)) {
                return directoryIdMap.get(path);
            }
            Directory directory = directoriesClient.createDirectory(directoryPayload);
            directoryId = directory.getId();
            directoryIdMap.put(path, directoryId);
            System.out.println(ExecutionStatus.OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.directory"), StringUtils.removePattern(path.toString(), "[\\\\/]$"))));
        } catch (ExistsResponseException e) {
            System.out.println(ExecutionStatus.SKIPPED.withIcon(String.format(RESOURCE_BUNDLE.getString("message.directory"), StringUtils.removePattern(path.toString(), "[\\\\/]$"))));
            if (directoryIdMap.containsKey(path)) {
                return directoryIdMap.get(path);
            } else {
                throw new RuntimeException("Couldn't create directory '" + path + "' because it's already here");
            }
        } catch (WaitResponseException e) {
            try {
                Thread.sleep(500);
            } catch (InterruptedException ignored) {
            }
            return createDirectory(directoriesClient, directoryPayload, path);
        } catch (ResponseException e) {
            throw new RuntimeException("Unhandled exception", e);
        } finally {
            lock.unlock();
        }
        return directoryId;
    }

    public static String getCommonPath(List<String> sources, String basePath) {
        String prepBasePath = StringUtils.removeStart(basePath, Utils.PATH_SEPARATOR);
        return StringUtils.removeStart(getCommonPath(sources), prepBasePath);
    }

    public static String getCommonPath(List<String> sources) {
        String result = "";
        String commonPrefix = StringUtils.getCommonPrefix(sources.toArray(new String[0]));
        result = commonPrefix.substring(0, commonPrefix.lastIndexOf(Utils.PATH_SEPARATOR)+1);
        result = StringUtils.removeStart(result, Utils.PATH_SEPARATOR);
        return result;
    }
}
