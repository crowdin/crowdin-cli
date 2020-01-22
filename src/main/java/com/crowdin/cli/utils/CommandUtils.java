package com.crowdin.cli.utils;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.BranchClient;
import com.crowdin.cli.client.DirectoriesClient;
import com.crowdin.cli.client.ProjectWrapper;
import com.crowdin.cli.client.exceptions.ExistsResponseException;
import com.crowdin.cli.client.exceptions.ResponseException;
import com.crowdin.cli.client.exceptions.WaitResponseException;
import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.properties.helper.FileHelper;
import com.crowdin.cli.utils.console.ConsoleUtils;
import com.crowdin.cli.utils.console.ExecutionStatus;
import com.crowdin.client.CrowdinRequestBuilder;
import com.crowdin.client.api.DirectoriesApi;
import com.crowdin.common.Settings;
import com.crowdin.common.models.*;
import com.crowdin.common.request.DirectoryPayload;
import com.crowdin.common.response.Page;
import com.crowdin.common.response.SimpleResponse;
import com.crowdin.util.PaginationUtil;
import com.crowdin.util.ResponseUtil;
import com.fasterxml.jackson.core.type.TypeReference;
import net.lingala.zip4j.core.ZipFile;
import org.apache.commons.cli.CommandLine;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.tuple.Pair;

import javax.ws.rs.core.Response;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.Lock;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;

import static com.crowdin.cli.commands.CrowdinCliOptions.BASE_URL_LONG;
import static com.crowdin.cli.commands.CrowdinCliOptions.TRANSLATION_SHORT;

public class CommandUtils extends BaseCli {

    private static final String USER_HOME = "user.home";

    public File getIdentityFile(CommandLine commandLine) {
        if (commandLine == null) {
            return null;
        }

        File identity;
        if (commandLine.hasOption(OPTION_NAME_IDENTITY) && commandLine.getOptionValue(OPTION_NAME_IDENTITY) != null) {
            identity = new File(commandLine.getOptionValue(OPTION_NAME_IDENTITY));
        } else {
            identity = getIdentity(FILE_NAME_IDENTITY_CROWDIN_YAML);
            if (identity == null || !identity.isFile()) {
                identity = getIdentity(FILE_NAME_IDENTITY_CROWDIN_YML);
            }
        }
        return identity;
    }

    private File getIdentity(String fileName) {
        File identity = null;
        if (fileName == null) {
            return identity;
        }
        String userHome = System.getProperty(USER_HOME);
        if (userHome != null && !userHome.isEmpty()) {
            userHome = userHome + Utils.PATH_SEPARATOR + fileName;
            userHome = userHome.replaceAll(Utils.PATH_SEPARATOR_REGEX + STRING_PLUS, Utils.PATH_SEPARATOR_REGEX);
            identity = new File(userHome);
        } else {
            identity = new File(fileName);
        }
        return identity;
    }

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

    public List<String> getSourcesWithoutIgnores(FileBean file, String basePath, PlaceholderUtil placeholderUtil) {
        if (file == null) {
            return Collections.emptyList();
        }
        FileHelper fileHelper = new FileHelper(basePath);
        List<File> sources = fileHelper.getFileSource(file.getSource());
        List<String> formattedIgnores = placeholderUtil.format(sources, file.getIgnore(), false);
        List<File> sourcesWithoutIgnores = fileHelper.filterOutIgnoredFiles(sources, formattedIgnores);

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


    private Map<String, Long> directoryIdMap = new ConcurrentHashMap<>();
    private Map<Long, String> branchNameMap = new ConcurrentHashMap<>();
    private final Map<String, Lock> pathLocks = new ConcurrentHashMap<>();

    public void addDirectoryIdMap(Map<String, Long> directoryIdMap, Map<Long, String> branchNameMap) {
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
        String branchPath = (branchId.map(branch -> branchNameMap.get(branch) + Utils.PATH_SEPARATOR).orElse(""));
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

    public Map<Long, String> getFilesFullPath(List<FileEntity> fileEntities, Settings settings, Long projectId) {
        CrowdinRequestBuilder<Page<Directory>> directoriesApi = new DirectoriesApi(settings).getProjectDirectories(projectId.toString(), Pageable.of(0, 500));
        List<Directory> projectDirectories = PaginationUtil.unpaged(directoriesApi);
        return fileEntities.stream()
                .map(fileEntity -> {
                    List<String> path = new ArrayList<>();
                    Long directoryId = fileEntity.getDirectoryId();
                    Long branchId = fileEntity.getBranchId();
                    while (directoryId != null) {
                        final Long finalDirectoryId = directoryId;
                        final Long finalBranchId = branchId;
                        Optional<Directory> directory = projectDirectories.stream()
                                .filter(pd -> Objects.equals(pd.getId(), finalDirectoryId) && Objects.equals(pd.getBranchId(), finalBranchId))
                                .findFirst();
                        if (directory.isPresent()) {
                            Directory dir = directory.get();
                            path.add(dir.getName().toLowerCase());
                            directoryId = dir.getDirectoryId();
                            branchId = dir.getBranchId();
                        } else {
                            break;
                        }
                    }
                    Collections.reverse(path);
                    String fullFilePath = path.stream().collect(Collectors.joining("/", "", "/")) + fileEntity.getName().toLowerCase();
                    if (fullFilePath.startsWith("/")) {
                        fullFilePath = fullFilePath.replaceFirst("/", "");
                    }
                    return Pair.of(fileEntity.getId(), fullFilePath);
                })
                .collect(Collectors.toConcurrentMap(Pair::getLeft, Pair::getRight));
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
            System.out.println(ExecutionStatus.OK.withIcon(RESOURCE_BUNDLE.getString("creating_directory") + " '" + StringUtils.removePattern(path.toString(), "[\\\\/]$") + "' "));
        } catch (ExistsResponseException e) {
            System.out.println(ExecutionStatus.SKIPPED.withIcon(RESOURCE_BUNDLE.getString("creating_directory") + " '" + StringUtils.removePattern(path.toString(), "[\\\\/]$") + "'"));
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

    public PropertiesBean makeConfigFromParameters(CommandLine commandLine, PropertiesBean propertiesBean) {
        if (propertiesBean == null || commandLine == null) {
            throw new NullPointerException("CommandUtils.makeConfigFromParameters has empty arguments");
        }

        FileBean fileBean = new FileBean();
        if (commandLine.getOptionValue("id") != null && !commandLine.getOptionValue("id").isEmpty()) {
            propertiesBean.setProjectId(commandLine.getOptionValue("id"));
        } else if (commandLine.getOptionValue("i") != null && !commandLine.getOptionValue("i").isEmpty()) {
            propertiesBean.setProjectId(commandLine.getOptionValue("i"));
        }
        if (commandLine.getOptionValue("token") != null && !commandLine.getOptionValue("token").isEmpty()) {
            propertiesBean.setApiToken(commandLine.getOptionValue("token"));
        } else if (commandLine.getOptionValue("pat") != null && !commandLine.getOptionValue("pat").isEmpty()) {
            propertiesBean.setApiToken(commandLine.getOptionValue("pat"));
        }
        if (commandLine.getOptionValue(BASE_URL_LONG) != null && !commandLine.getOptionValue(BASE_URL_LONG).isEmpty()) {
            /* todo need refactor method getBaseUrl */
            propertiesBean.setBaseUrl(getBaseUrl(commandLine.getOptionValue(BASE_URL_LONG)));
        }
        if (commandLine.getOptionValue("base-path") != null && !commandLine.getOptionValue("base-path").isEmpty()) {
            propertiesBean.setBasePath(commandLine.getOptionValue("base-path"));
        }
        if (commandLine.getOptionValue("source") != null && !commandLine.getOptionValue("source").isEmpty()) {
            fileBean.setSource(commandLine.getOptionValue("source"));
        } else if (commandLine.getOptionValue("s") != null && !commandLine.getOptionValue("s").isEmpty()) {
            fileBean.setSource(commandLine.getOptionValue("s"));
        }
        if (commandLine.getOptionValue("translation") != null && !commandLine.getOptionValue("translation").isEmpty()) {
            fileBean.setTranslation(commandLine.getOptionValue("translation"));
        } else if (commandLine.getOptionValue(TRANSLATION_SHORT) != null && !commandLine.getOptionValue(TRANSLATION_SHORT).isEmpty()) {
            fileBean.setTranslation(commandLine.getOptionValue(TRANSLATION_SHORT));
        }


        if ((fileBean.getSource() != null && !fileBean.getSource().isEmpty())
                || (fileBean.getTranslation() != null && !fileBean.getTranslation().isEmpty())) {
            propertiesBean.getFiles().clear();
            propertiesBean.setFiles(fileBean);
        } else {
            propertiesBean = null;
        }
        return propertiesBean;
    }

    public void sortFilesName(List<String> files) {
        files.sort(Comparator.comparing(String::toString));
    }

    public String getBranch(CommandLine commandLine) {
        String branch = null;
        if (commandLine.getOptionValue(COMMAND_BRANCH_SHORT) != null && !commandLine.getOptionValue(COMMAND_BRANCH_SHORT).isEmpty()) {
            branch = commandLine.getOptionValue(COMMAND_BRANCH_SHORT).trim();
        } else if (commandLine.getOptionValue(COMMAND_BRANCH_LONG) != null && !commandLine.getOptionValue(COMMAND_BRANCH_LONG).isEmpty()) {
            branch = commandLine.getOptionValue(COMMAND_BRANCH_LONG).trim();
        }
        return branch;
    }

    public String getLanguage(CommandLine commandLine) {
        String language = null;
        if (commandLine.getOptionValue(COMMAND_LANGUAGE_SHORT) != null && !commandLine.getOptionValue(COMMAND_LANGUAGE_SHORT).isEmpty()) {
            language = commandLine.getOptionValue(COMMAND_LANGUAGE_SHORT).trim();
        } else if (commandLine.getOptionValue(COMMAND_LANGUAGE_LONG) != null && !commandLine.getOptionValue(COMMAND_LANGUAGE_LONG).isEmpty()) {
            language = commandLine.getOptionValue(COMMAND_LANGUAGE_LONG).trim();
        }
        return language;
    }

    public void renameMappingFiles(Map<String, String> mapping, String baseTempDir, PropertiesBean propertiesBean, String commonPath) {
        for (Map.Entry<String, String> entry : mapping.entrySet()) {
            String preservedKey = entry.getKey();
            if (!propertiesBean.getPreserveHierarchy()) {
                if (Utils.isWindows() && commonPath != null && commonPath.contains("\\")) {
                    commonPath = commonPath.replaceAll("\\\\", "/");
                }
                commonPath = commonPath.replaceAll("/+", "/");
                preservedKey = preservedKey.replaceAll("/+", "/");
                if (preservedKey.startsWith(commonPath)) {
                    for (FileBean file : propertiesBean.getFiles()) {
                        String ep = file.getTranslation();
                        if (ep != null && !ep.startsWith(commonPath) && !this.isSourceContainsPattern(ep) && !entry.getValue().startsWith(commonPath)) {
                            preservedKey = preservedKey.replaceFirst(commonPath, "");
                        }
                    }
                }
            }
            String key = baseTempDir + Utils.PATH_SEPARATOR + preservedKey;
            key = key.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);
            String value = propertiesBean.getBasePath() + Utils.PATH_SEPARATOR + entry.getValue();
            value = value.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);
            if (Utils.isWindows()) {
                key = key.replaceAll("/+", Utils.PATH_SEPARATOR_REGEX);
                key = key.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);
                value = value.replaceAll("/+", Utils.PATH_SEPARATOR_REGEX);
                value = value.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);
            }
            if (!key.equals(value)) {
                File oldFile = new File(key);
                File newFile = new File(value);
                if (oldFile.isFile()) {
                    //noinspection ResultOfMethodCallIgnored
                    newFile.getParentFile().mkdirs();
                    if (!oldFile.renameTo(newFile)) {
                        if (newFile.delete()) {
                            if (!oldFile.renameTo(newFile)) {
                                System.out.println("Replacing file '" + newFile.getAbsolutePath() + "' failed. Try to run an application with Administrator permission.");
                            }
                        }
                    }
                }
            }
        }
    }

    public void extractFiles(List<String> downloadedFiles, List<String> files, String baseTempDir, boolean ignore_match,
                             File downloadedZipArchive, Map<String, String> mapping, boolean isDebug, String branch,
                             PropertiesBean propertiesBean, String commonPath) {
        ZipFile zFile = null;
        try {
            zFile = new ZipFile(downloadedZipArchive.getAbsolutePath());
        } catch (Exception e) {
            System.out.println("An archive '" + downloadedZipArchive.getAbsolutePath() + "' does not exist");
            if (isDebug) {
                e.printStackTrace();
                ConsoleUtils.exitError();
            }
        }
        File tmpDir = new File(baseTempDir);
        if (!tmpDir.exists()) {
            try {
                Files.createDirectory(tmpDir.toPath());
            } catch (IOException ex) {
                System.out.println(RESOURCE_BUNDLE.getString("error_extracting"));
            }
        }
        try {
            zFile.extractAll(tmpDir.getAbsolutePath());
        } catch (Exception e) {
            System.out.println("Extracting an archive '" + downloadedZipArchive + "' failed");
            if (isDebug) {
                e.printStackTrace();
                ConsoleUtils.exitError();
            }
        }
        List<String> ommitedFiles = new ArrayList<>();
        List<String> extractingFiles = new ArrayList<>();
        for (String downloadedFile : downloadedFiles) {
            if (!files.contains(downloadedFile) && !files.contains(downloadedFile.replaceFirst("/", ""))) {
                if (branch != null && !branch.isEmpty()) {
                    ommitedFiles.add(downloadedFile.replaceFirst("/" + branch + "/", ""));
                } else {
                    ommitedFiles.add(downloadedFile);
                }
            } else {
                if (branch != null && !branch.isEmpty()) {
                    if (downloadedFile.startsWith("/" + branch + "/")) {
                        downloadedFile = downloadedFile.replaceFirst("/", "");
                        downloadedFile = downloadedFile.replaceFirst(branch, "");
                        downloadedFile = downloadedFile.replaceFirst("/", "");
                    }
                    extractingFiles.add(downloadedFile);
                } else {
                    extractingFiles.add(downloadedFile);
                }
            }
        }
        List<String> sortedExtractingFiles = new ArrayList<>();
        for (Map.Entry<String, String> extractingMappingFile : mapping.entrySet()) {
            String k = extractingMappingFile.getKey();
            k = k.replaceAll("/+", "/");
            if (k.contains(Utils.PATH_SEPARATOR)) {
                k = k.replaceAll(Utils.PATH_SEPARATOR_REGEX, "/");
                k = k.replaceAll("/+", "/");
            }
            if (k.contains("/")) {
                k = k.replaceAll("/+", "/");
            }
            if (!propertiesBean.getPreserveHierarchy()) {
                if (k.startsWith(commonPath)) {
                    for (FileBean file : propertiesBean.getFiles()) {
                        String ep = file.getTranslation();
                        if (ep != null && !ep.startsWith(commonPath) && !this.isSourceContainsPattern(ep) && !extractingMappingFile.getValue().startsWith(commonPath)) {
                            k = k.replaceFirst(commonPath, "");
                        }
                    }
                }
            }
            if (k.startsWith("/")) {
                k = k.replaceFirst("/", "");
            }
            String v = extractingMappingFile.getValue();
            if (v.contains(Utils.PATH_SEPARATOR)) {
                v = v.replaceAll(Utils.PATH_SEPARATOR_REGEX, "/");
                v = v.replaceAll("/+", "/");
            }
            if (extractingFiles.contains(k) || extractingFiles.contains("/" + k)) {
                sortedExtractingFiles.add(v);
            }
        }
        this.sortFilesName(sortedExtractingFiles);
        for (String sortedExtractingFile : sortedExtractingFiles) {
            System.out.println("Extracting: '" + sortedExtractingFile + "'");
        }
        if (ommitedFiles.size() > 0 && !ignore_match) {
            this.sortFilesName(ommitedFiles);
            System.out.println(RESOURCE_BUNDLE.getString("downloaded_file_omitted"));
            for (String ommitedFile : ommitedFiles) {
                System.out.println(" - '" + ommitedFile + "'");
            }
        }
    }

    public List<String> getListOfFileFromArchive(File downloadedZipArchive, boolean isDebug) {
        List<String> downloadedFiles = new ArrayList<>();
        java.util.zip.ZipFile zipFile = null;
        try {
            zipFile = new java.util.zip.ZipFile(downloadedZipArchive.getAbsolutePath());
        } catch (Exception e) {
            System.out.println("Extracting archive '" + downloadedZipArchive + "' failed");
            if (isDebug) {
                e.printStackTrace();
                ConsoleUtils.exitError();
            }
        }
        Enumeration zipEntries = zipFile.entries();
        while (zipEntries.hasMoreElements()) {
            ZipEntry ze = (ZipEntry) zipEntries.nextElement();
            if (!ze.isDirectory()) {
                String fname = ze.getName();
                if (!fname.startsWith(Utils.PATH_SEPARATOR)) {
                    fname = Utils.PATH_SEPARATOR + fname;
                    if (Utils.isWindows()) {
                        fname = fname.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", "/");
                    }
                }
                downloadedFiles.add(fname);
            }
        }
        try {
            zipFile.close();
        } catch (IOException e) {
        }
        return downloadedFiles;
    }

    private <T> Map<String, String> map(String translations,
                                        String mappingTranslations,
                                        Language languageInfo,
                                        FileBean file,
                                        String placeholder,
                                        String pattern,
                                        Function<Language, T> fieldExtractor) {
        if (file == null || languageInfo == null || translations == null || mappingTranslations == null) {
            return null;
        }
        Map<String, String> result = new HashMap<>();
        boolean isMapped = false;
        String localWithUnderscore = null;
        if (PLACEHOLDER_LOCALE_WITH_UNDERSCORE.equals(pattern)) {
            localWithUnderscore = languageInfo.getLocale().replace("-", "_");
            translations = translations.replace(pattern, localWithUnderscore);
        }
        if (PLACEHOLDER_ANDROID_CODE.equals(pattern)) {
            translations = translations.replace(pattern, languageInfo.getAndroidCode());
        } else if (PLACEHOLDER_OSX_CODE.equals(pattern)) {
            translations = translations.replace(pattern, languageInfo.getOsxCode());
        } else if (PLACEHOLDER_OSX_LOCALE.equals(pattern)) {
            translations = translations.replace(pattern, languageInfo.getOsxLocale());
        } else {
            String fieldValue = fieldExtractor.apply(languageInfo).toString();
            translations = translations.replace(pattern, fieldValue);
        }

        Map<String, String> map = new HashMap<>();
        if (file.getLanguagesMapping() != null) {
            if ("name".equals(placeholder)) {
                map = file.getLanguagesMapping().get("language");
            } else if ("locale".equals(placeholder) && localWithUnderscore != null) {
                map = file.getLanguagesMapping().get("locale_with_underscore");
            } else {
                map = file.getLanguagesMapping().get(placeholder);
            }
        }
        if (map != null) {
            for (Map.Entry<String, String> hashMap : map.entrySet()) {
                if (languageInfo.getId().equals(hashMap.getKey())) {
                    mappingTranslations = mappingTranslations.replace(pattern, hashMap.getValue());
                    isMapped = true;
                    break;
                }
            }
        }
        if (!isMapped) {
            String replacement;
            switch (pattern) {
                case PLACEHOLDER_ANDROID_CODE:
                    replacement = languageInfo.getAndroidCode();
                    break;
                case PLACEHOLDER_OSX_CODE:
                    replacement = languageInfo.getOsxCode();
                    break;
                case PLACEHOLDER_OSX_LOCALE:
                    replacement = languageInfo.getOsxLocale();
                    break;
                default:
                    String fieldValue = fieldExtractor.apply(languageInfo).toString();
                    replacement = (localWithUnderscore == null) ? fieldValue : localWithUnderscore;
                    break;
            }
            mappingTranslations = mappingTranslations.replace(pattern, replacement);
        }
        result.put(translations, mappingTranslations);
        return result;
    }

    public Map<String, String> doLanguagesMapping(ProjectWrapper projectInfo,
                                                  PropertiesBean propertiesBean,
                                                  String lang,
                                                  PlaceholderUtil placeholderUtil) {
        Map<String, String> mapping = new HashMap<>();

        Map<FileBean, List<String>> sourcesByFileBean = new IdentityHashMap<>();
        List<FileBean> files = propertiesBean.getFiles();
        for (FileBean file : files) {
            sourcesByFileBean.put(file, getSourcesWithoutIgnores(file, propertiesBean.getBasePath(), placeholderUtil));
        }

        Optional<Language> projectLanguageOrNull = projectInfo.getProjectLanguageByCrowdinCode(lang);
        if (!projectLanguageOrNull.isPresent()) return mapping;

        Language projectLanguage = projectLanguageOrNull.get();

        for (FileBean file : files) {
            List<String> projectFiles = sourcesByFileBean.get(file);
            String translationsBase = file.getTranslation();
            String translationsMapping = file.getTranslation();
            if (translationsBase != null && !translationsBase.isEmpty()) {
                if (translationsBase.contains(PLACEHOLDER_LANGUAGE)) {
                    Map<String, String> locale = this.map(translationsBase, translationsMapping, projectLanguage, file, "name", PLACEHOLDER_LANGUAGE, Language::getName);
                    if (locale != null) {
                        for (Map.Entry<String, String> language : locale.entrySet()) {
                            translationsBase = language.getKey();
                            translationsMapping = language.getValue();
                        }
                    }
                }
                if (translationsBase.contains(PLACEHOLDER_LOCALE)) {
                    Map<String, String> locale = this.map(translationsBase, translationsMapping, projectLanguage, file, "locale", PLACEHOLDER_LOCALE, Language::getLocale);
                    if (locale != null) {
                        for (Map.Entry<String, String> language : locale.entrySet()) {
                            translationsBase = language.getKey();
                            translationsMapping = language.getValue();
                        }
                    }
                }
                if (translationsBase.contains(PLACEHOLDER_LOCALE_WITH_UNDERSCORE)) {
                    Map<String, String> undersoceLocale = this.map(translationsBase, translationsMapping, projectLanguage, file, "locale", PLACEHOLDER_LOCALE_WITH_UNDERSCORE, Language::getLocale);
                    if (undersoceLocale != null) {
                        for (Map.Entry<String, String> language : undersoceLocale.entrySet()) {
                            translationsBase = language.getKey();
                            translationsMapping = language.getValue();
                        }
                    }
                }
                if (translationsBase.contains(PLACEHOLDER_TWO_LETTERS_CODE)) {
                    Map<String, String> twoLettersCode = this.map(translationsBase, translationsMapping, projectLanguage, file, "two_letters_code", PLACEHOLDER_TWO_LETTERS_CODE, Language::getTwoLettersCode);
                    if (twoLettersCode != null) {
                        for (Map.Entry<String, String> language : twoLettersCode.entrySet()) {
                            translationsBase = language.getKey();
                            translationsMapping = language.getValue();
                        }

                    }
                }
                if (translationsBase.contains(PLACEHOLDER_THREE_LETTERS_CODE)) {
                    Map<String, String> threeLettersCode = this.map(translationsBase, translationsMapping, projectLanguage, file, "three_letters_code", PLACEHOLDER_THREE_LETTERS_CODE, Language::getThreeLettersCode);
                    if (threeLettersCode != null) {
                        for (Map.Entry<String, String> language : threeLettersCode.entrySet()) {
                            translationsBase = language.getKey();
                            translationsMapping = language.getValue();
                        }
                    }
                }
                if (translationsBase.contains(PLACEHOLDER_ANDROID_CODE)) {
                    Map<String, String> androidCode = this.map(translationsBase, translationsMapping, projectLanguage, file, "android_code", PLACEHOLDER_ANDROID_CODE, Language::getAndroidCode);
                    if (androidCode != null) {
                        for (Map.Entry<String, String> language : androidCode.entrySet()) {
                            translationsBase = language.getKey();
                            translationsMapping = language.getValue();
                        }
                    }
                }
                if (translationsBase.contains(PLACEHOLDER_OSX_CODE)) {
                    Map<String, String> osxCode = this.map(translationsBase, translationsMapping, projectLanguage, file, "osx_code", PLACEHOLDER_OSX_CODE, Language::getOsxCode);
                    if (osxCode != null) {
                        for (Map.Entry<String, String> language : osxCode.entrySet()) {
                            translationsBase = language.getKey();
                            translationsMapping = language.getValue();
                        }
                    }
                }
                if (translationsBase.contains(PLACEHOLDER_OSX_LOCALE)) {
                    Map<String, String> osxLocale = this.map(translationsBase, translationsMapping, projectLanguage, file, "osx_locale", PLACEHOLDER_OSX_LOCALE, Language::getOsxLocale);
                    if (osxLocale != null) {
                        for (Map.Entry<String, String> language : osxLocale.entrySet()) {
                            translationsBase = language.getKey();
                            translationsMapping = language.getValue();
                        }
                    }
                }
                for (String projectFile : projectFiles) {
                    File f = new File(projectFile);
                    String temporaryTranslation = translationsBase;
                    String temporaryTranslationsMapping = translationsMapping;
                    String fileParent = new File(f.getParent()).getAbsolutePath();
                    fileParent = Utils.replaceBasePath(fileParent, propertiesBean.getBasePath());
                    if (fileParent.startsWith(Utils.PATH_SEPARATOR)) {
                        fileParent = fileParent.replaceFirst(Utils.PATH_SEPARATOR_REGEX, "");
                    }
                    temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_ORIGINAL_FILE_NAME, f.getName());
                    temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_FILE_NAME, FilenameUtils.removeExtension(f.getName()));
                    temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_FILE_EXTENTION, FilenameUtils.getExtension(f.getName()));
                    temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_ORIGINAL_PATH, fileParent);
                    temporaryTranslationsMapping = temporaryTranslationsMapping.replace(PLACEHOLDER_ORIGINAL_FILE_NAME, f.getName());
                    temporaryTranslationsMapping = temporaryTranslationsMapping.replace(PLACEHOLDER_FILE_NAME, FilenameUtils.removeExtension(f.getName()));
                    temporaryTranslationsMapping = temporaryTranslationsMapping.replace(PLACEHOLDER_FILE_EXTENTION, FilenameUtils.getExtension(f.getName()));
                    temporaryTranslationsMapping = temporaryTranslationsMapping.replace(PLACEHOLDER_ORIGINAL_PATH, fileParent);
                    temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_ANDROID_CODE, projectLanguage.getAndroidCode());
                    temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_OSX_CODE, projectLanguage.getOsxCode());
                    temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_OSX_LOCALE, projectLanguage.getOsxLocale());
                    String k = this.replaceDoubleAsteriskInTranslation(temporaryTranslation, f.getAbsolutePath(), file.getSource(), propertiesBean.getBasePath());
                    String v = this.replaceDoubleAsteriskInTranslation(temporaryTranslationsMapping, f.getAbsolutePath(), file.getSource(), propertiesBean.getBasePath());
                    k = k.replaceAll(Utils.PATH_SEPARATOR_REGEX, "/");
                    k = k.replaceAll("/+", "/");
                    if (file.getTranslationReplace() != null && !file.getTranslationReplace().isEmpty()) {
                        v = this.doTranslationReplace(v, file.getTranslationReplace());
                    }
                    mapping.put(k, v);
                }
            }
        }

        return mapping;
    }

    public Map<String, String> doLanguagesMapping(Optional<Language> projectLanguageOrNull,
                                                  List<FileBean> files,
                                                  String basePath,
                                                  PlaceholderUtil placeholderUtil) {
        Map<String, String> mapping = new HashMap<>();

        Map<FileBean, List<String>> sourcesByFileBean = new IdentityHashMap<>();
        for (FileBean file : files) {
            sourcesByFileBean.put(file, getSourcesWithoutIgnores(file, basePath, placeholderUtil));
        }

        if (!projectLanguageOrNull.isPresent()) return mapping;

        Language projectLanguage = projectLanguageOrNull.get();

        for (FileBean file : files) {
            List<String> projectFiles = sourcesByFileBean.get(file);
            String translationsBase = file.getTranslation();
            String translationsMapping = file.getTranslation();
            if (translationsBase != null && !translationsBase.isEmpty()) {
                if (translationsBase.contains(PLACEHOLDER_LANGUAGE)) {
                    Map<String, String> locale = this.map(translationsBase, translationsMapping, projectLanguage, file, "name", PLACEHOLDER_LANGUAGE, Language::getName);
                    if (locale != null) {
                        for (Map.Entry<String, String> language : locale.entrySet()) {
                            translationsBase = language.getKey();
                            translationsMapping = language.getValue();
                        }
                    }
                }
                if (translationsBase.contains(PLACEHOLDER_LOCALE)) {
                    Map<String, String> locale = this.map(translationsBase, translationsMapping, projectLanguage, file, "locale", PLACEHOLDER_LOCALE, Language::getLocale);
                    if (locale != null) {
                        for (Map.Entry<String, String> language : locale.entrySet()) {
                            translationsBase = language.getKey();
                            translationsMapping = language.getValue();
                        }
                    }
                }
                if (translationsBase.contains(PLACEHOLDER_LOCALE_WITH_UNDERSCORE)) {
                    Map<String, String> undersoceLocale = this.map(translationsBase, translationsMapping, projectLanguage, file, "locale", PLACEHOLDER_LOCALE_WITH_UNDERSCORE, Language::getLocale);
                    if (undersoceLocale != null) {
                        for (Map.Entry<String, String> language : undersoceLocale.entrySet()) {
                            translationsBase = language.getKey();
                            translationsMapping = language.getValue();
                        }
                    }
                }
                if (translationsBase.contains(PLACEHOLDER_TWO_LETTERS_CODE)) {
                    Map<String, String> twoLettersCode = this.map(translationsBase, translationsMapping, projectLanguage, file, "two_letters_code", PLACEHOLDER_TWO_LETTERS_CODE, Language::getTwoLettersCode);
                    if (twoLettersCode != null) {
                        for (Map.Entry<String, String> language : twoLettersCode.entrySet()) {
                            translationsBase = language.getKey();
                            translationsMapping = language.getValue();
                        }

                    }
                }
                if (translationsBase.contains(PLACEHOLDER_THREE_LETTERS_CODE)) {
                    Map<String, String> threeLettersCode = this.map(translationsBase, translationsMapping, projectLanguage, file, "three_letters_code", PLACEHOLDER_THREE_LETTERS_CODE, Language::getThreeLettersCode);
                    if (threeLettersCode != null) {
                        for (Map.Entry<String, String> language : threeLettersCode.entrySet()) {
                            translationsBase = language.getKey();
                            translationsMapping = language.getValue();
                        }
                    }
                }
                if (translationsBase.contains(PLACEHOLDER_ANDROID_CODE)) {
                    Map<String, String> androidCode = this.map(translationsBase, translationsMapping, projectLanguage, file, "android_code", PLACEHOLDER_ANDROID_CODE, Language::getAndroidCode);
                    if (androidCode != null) {
                        for (Map.Entry<String, String> language : androidCode.entrySet()) {
                            translationsBase = language.getKey();
                            translationsMapping = language.getValue();
                        }
                    }
                }
                if (translationsBase.contains(PLACEHOLDER_OSX_CODE)) {
                    Map<String, String> osxCode = this.map(translationsBase, translationsMapping, projectLanguage, file, "osx_code", PLACEHOLDER_OSX_CODE, Language::getOsxCode);
                    if (osxCode != null) {
                        for (Map.Entry<String, String> language : osxCode.entrySet()) {
                            translationsBase = language.getKey();
                            translationsMapping = language.getValue();
                        }
                    }
                }
                if (translationsBase.contains(PLACEHOLDER_OSX_LOCALE)) {
                    Map<String, String> osxLocale = this.map(translationsBase, translationsMapping, projectLanguage, file, "osx_locale", PLACEHOLDER_OSX_LOCALE, Language::getOsxLocale);
                    if (osxLocale != null) {
                        for (Map.Entry<String, String> language : osxLocale.entrySet()) {
                            translationsBase = language.getKey();
                            translationsMapping = language.getValue();
                        }
                    }
                }
                for (String projectFile : projectFiles) {
                    File f = new File(projectFile);
                    String temporaryTranslation = translationsBase;
                    String temporaryTranslationsMapping = translationsMapping;
                    String fileParent = new File(f.getParent()).getAbsolutePath();
                    fileParent = Utils.replaceBasePath(fileParent, basePath);
                    if (fileParent.startsWith(Utils.PATH_SEPARATOR)) {
                        fileParent = fileParent.replaceFirst(Utils.PATH_SEPARATOR_REGEX, "");
                    }
                    temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_ORIGINAL_FILE_NAME, f.getName());
                    temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_FILE_NAME, FilenameUtils.removeExtension(f.getName()));
                    temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_FILE_EXTENTION, FilenameUtils.getExtension(f.getName()));
                    temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_ORIGINAL_PATH, fileParent);
                    temporaryTranslationsMapping = temporaryTranslationsMapping.replace(PLACEHOLDER_ORIGINAL_FILE_NAME, f.getName());
                    temporaryTranslationsMapping = temporaryTranslationsMapping.replace(PLACEHOLDER_FILE_NAME, FilenameUtils.removeExtension(f.getName()));
                    temporaryTranslationsMapping = temporaryTranslationsMapping.replace(PLACEHOLDER_FILE_EXTENTION, FilenameUtils.getExtension(f.getName()));
                    temporaryTranslationsMapping = temporaryTranslationsMapping.replace(PLACEHOLDER_ORIGINAL_PATH, fileParent);
                    temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_ANDROID_CODE, projectLanguage.getAndroidCode());
                    temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_OSX_CODE, projectLanguage.getOsxCode());
                    temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_OSX_LOCALE, projectLanguage.getOsxLocale());
                    String k = this.replaceDoubleAsteriskInTranslation(temporaryTranslation, f.getAbsolutePath(), file.getSource(), basePath);
                    String v = this.replaceDoubleAsteriskInTranslation(temporaryTranslationsMapping, f.getAbsolutePath(), file.getSource(), basePath);
                    k = k.replaceAll(Utils.PATH_SEPARATOR_REGEX, "/");
                    k = k.replaceAll("/+", "/");
                    if (file.getTranslationReplace() != null && !file.getTranslationReplace().isEmpty()) {
                        v = this.doTranslationReplace(v, file.getTranslationReplace());
                    }
                    mapping.put(k, v);
                }
            }
        }

        return mapping;
    }

    private String doTranslationReplace(String value, Map<String, String> translationReplace) {
        for (Map.Entry<String, String> translationReplaceEntry : translationReplace.entrySet()) {
            String translationReplaceKey = this.normalizeTranslationReplaceKey(translationReplaceEntry.getKey());
            String translationReplaceValue = translationReplaceEntry.getValue();
            if (value.contains(translationReplaceKey)) {
                value = value.replace(translationReplaceKey, translationReplaceValue);
            }
        }
        return value;
    }

    private String normalizeTranslationReplaceKey(String translationReplaceKey) {
        String normalizedValue = translationReplaceKey;
        normalizedValue = normalizedValue.replaceAll("\\\\", "");
        normalizedValue = normalizedValue.replaceAll("/+", "");
        normalizedValue = normalizedValue.replaceAll("/", "");
        normalizedValue = normalizedValue.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", "");
        return normalizedValue;
    }

    public List<String> getTranslations(String lang,
                                        String sourceFile,
                                        FileBean file,
                                        List<Language> projectLanguages,
                                        List<Language> supportedLanguages,
                                        PropertiesBean propertiesBean,
                                        String command,
                                        PlaceholderUtil placeholderUtil) {
        List<String> result = new ArrayList<>();
        for (Language projectLanguage : projectLanguages) {
            String langName = projectLanguage.getName();
            if (langName != null && !langName.isEmpty()) {

                Language language = EntityUtils
                        .find(supportedLanguages, l -> l.getName().equalsIgnoreCase(langName))
                        .orElse(null);
                if (language == null) {
                    ConsoleUtils.exitError();
                }

                if (lang != null && !lang.isEmpty() && !lang.equals(language.getId())) {
                    continue;
                }


                if (file != null) {
                    String translations = file.getTranslation();
                    if (translations != null && !translations.isEmpty()) {
                        if (translations.contains(PLACEHOLDER_LANGUAGE)) {
                            translations = translations.replace(PLACEHOLDER_LANGUAGE, language.getName() /*langsInfo.getString("name")*/);
                        }
                        if (translations.contains(PLACEHOLDER_LOCALE)) {
                            translations = translations.replace(PLACEHOLDER_LOCALE, language.getLocale() /*langsInfo.getString("locale")*/);
                        }
                        if (translations.contains(PLACEHOLDER_LOCALE_WITH_UNDERSCORE)) {
                            String localWithUnderscore = language.getLocale().replace("-", "_");///*langsInfo.getString("locale")*/
                            translations = translations.replace(PLACEHOLDER_LOCALE_WITH_UNDERSCORE, localWithUnderscore);
                        }
                        if (translations.contains(PLACEHOLDER_TWO_LETTERS_CODE)) {
                            translations = translations.replace(PLACEHOLDER_TWO_LETTERS_CODE, language.getTwoLettersCode()); //langsInfo.getString("two_letters_code"));
                        }
                        if (translations.contains(PLACEHOLDER_THREE_LETTERS_CODE)) {
                            translations = translations.replace(PLACEHOLDER_THREE_LETTERS_CODE, language.getThreeLettersCode()); // langsInfo.getString("three_letters_code"));
                        }
                        if (translations.contains(PLACEHOLDER_ANDROID_CODE)) {
                            translations = translations.replace(PLACEHOLDER_ANDROID_CODE, language.getAndroidCode()); //langsInfo.getString("android_code"));
                        }
                        if (translations.contains(PLACEHOLDER_OSX_LOCALE)) {
                            translations = translations.replace(PLACEHOLDER_OSX_LOCALE, language.getOsxLocale());//langsInfo.getString("osx_locale"));
                        }
                        if (translations.contains(PLACEHOLDER_OSX_CODE)) {
                            translations = translations.replace(PLACEHOLDER_OSX_CODE, language.getOsxCode()); // langsInfo.getString("osx_code"));
                        }
                        List<String> projectFiles = this.getSourcesWithoutIgnores(file, propertiesBean.getBasePath(), placeholderUtil);
                        String commonPath;
                        String[] common = new String[projectFiles.size()];
                        common = projectFiles.toArray(common);
                        commonPath = Utils.commonPath(common);
                        for (String projectFile : projectFiles) {
                            File f = new File(projectFile);
                            String temporaryTranslation = translations;
                            String originalFileName = f.getName();
                            String fileNameWithoutExt = FilenameUtils.removeExtension(f.getName());
                            String fileExt = FilenameUtils.getExtension(f.getName());
                            String fileParent = new File(f.getParent()).getAbsolutePath();
                            if (!propertiesBean.getPreserveHierarchy() && "download".equals(command)) {
                                if (Utils.isWindows()) {
                                    fileParent = fileParent.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", "/");
                                    commonPath = commonPath.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", "/");
                                    fileParent = fileParent.replaceFirst(commonPath, "");
                                    fileParent = fileParent.replaceAll("/+", Utils.PATH_SEPARATOR_REGEX);
                                    commonPath = commonPath.replaceAll("/+", Utils.PATH_SEPARATOR_REGEX);
                                } else {
                                    fileParent = Utils.replaceBasePath(fileParent, propertiesBean.getBasePath());
                                }
                            } else {
                                fileParent = Utils.replaceBasePath(fileParent, propertiesBean.getBasePath());
                            }
                            fileParent = fileParent.replaceAll("/+", "/");
                            String androidLocaleCode = language.getAndroidCode();
                            String osxLocaleCode = language.getOsxCode();
                            String osxCode = language.getOsxCode();
                            temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_ORIGINAL_FILE_NAME, originalFileName);
                            temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_FILE_NAME, fileNameWithoutExt);
                            temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_FILE_EXTENTION, fileExt);
                            temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_ORIGINAL_PATH, fileParent);
                            temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_ANDROID_CODE, androidLocaleCode);
                            temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_OSX_CODE, osxCode);
                            temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_OSX_LOCALE, osxLocaleCode);
                            if (sourceFile != null) {
                                if (sourceFile.equals(projectFile)) {
                                    result.add(this.replaceDoubleAsteriskInTranslation(temporaryTranslation, f.getAbsolutePath(), file.getSource(), propertiesBean.getBasePath()));
                                }
                            } else {
                                result.add(this.replaceDoubleAsteriskInTranslation(temporaryTranslation, f.getAbsolutePath(), file.getSource(), propertiesBean.getBasePath()));
                            }
                        }
                    }
                }
            }
        }

        return result;
    }

    public String getBaseUrl(String baseUrl) {
        String baseUrlResult;
        if (StringUtils.isNotEmpty(baseUrl)) {
            baseUrlResult = baseUrl;
            System.out.println(!(baseUrlResult.endsWith("api/v2") || baseUrlResult.endsWith("/api/v2")));
            if (!(baseUrlResult.endsWith("api/v2") || baseUrlResult.endsWith("/api/v2"))) {
                baseUrlResult = StringUtils.removeEnd(baseUrlResult, "/");
                baseUrlResult = baseUrlResult + "/api/v2";
            }
        } else {
            baseUrlResult = Utils.getBaseUrl();
        }
        return baseUrlResult;
    }

    public String getBasePath(String basePath, File configurationFile, boolean isDebug) {
        String result = "";
        if (basePath != null && Paths.get(basePath) != null) {
            if (Paths.get(basePath).isAbsolute()) {
                result = basePath;
            } else if (configurationFile != null && configurationFile.isFile()) {
                basePath = ".".equals(basePath) ? "" : basePath;
                Path parentPath = Paths.get(configurationFile.getAbsolutePath()).getParent();
                File base = new File(parentPath.toFile(), basePath);
                try {
                    result = base.getCanonicalPath();
                } catch (IOException e) {
                    System.out.println(RESOURCE_BUNDLE.getString("bad_base_path"));
                    if (isDebug) {
                        e.printStackTrace();
                    }
                }
            } else {
                try {
                    result = new File(basePath).getCanonicalPath();
                } catch (IOException e) {
                    System.out.println(RESOURCE_BUNDLE.getString("bad_base_path"));
                    if (isDebug) {
                        e.printStackTrace();
                    }
                }
            }
        } else if (configurationFile != null && configurationFile.isFile()) {
            basePath = (basePath == null) ? "" : basePath;
            result = Paths.get(configurationFile.getAbsolutePath()).getParent() + Utils.PATH_SEPARATOR + basePath;
            result = result.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);
        }
        return result;
    }

    public String getCommonPath(List<String> sources, String basePath) {
        String prepBasePath = StringUtils.removeStart(basePath, Utils.PATH_SEPARATOR);
        return StringUtils.removeStart(getCommonPath(sources), prepBasePath);
    }

    public String getCommonPath(List<String> sources) {
        String result = "";
        String commonPrefix = StringUtils.getCommonPrefix(sources.toArray(new String[0]));
        result = commonPrefix.substring(0, commonPrefix.lastIndexOf(Utils.PATH_SEPARATOR)+1);
        result = StringUtils.removeStart(result, Utils.PATH_SEPARATOR);
        return result;
    }

    public List<String> buildPaths(List<FileEntity> files, List<Directory> directories, Map<Long, String> branches, Long branchId) {
        Map<Long, Directory> directoriesMap = directories.stream()
                .collect(Collectors.toMap(Directory::getId, Function.identity()));
        List<String> paths = new ArrayList<>();
        for (FileEntity file : files) {
            StringBuilder sb = new StringBuilder(Utils.PATH_SEPARATOR + file.getName());
            Long directoryId = file.getDirectoryId();
            if (directoryId == null && !Objects.equals(file.getBranchId(), branchId)) {
                continue;
            }
            Directory parent = null;
            while (directoryId != null) {
                parent = directoriesMap.get(directoryId);
                sb.insert(0, Utils.PATH_SEPARATOR + parent.getName());
                directoryId = parent.getDirectoryId();
            }
            if (parent != null && !Objects.equals(parent.getBranchId(), branchId)) {
                continue;
            }
            if (parent != null && parent.getBranchId() != null) {
                sb.insert(0, Utils.PATH_SEPARATOR + branches.get(parent.getBranchId()));
            } else if (file.getBranchId() != null) {
                sb.insert(0, Utils.PATH_SEPARATOR + branches.get(file.getBranchId()));
            }
            paths.add(sb.toString());
        }
        return paths;
    }
}
