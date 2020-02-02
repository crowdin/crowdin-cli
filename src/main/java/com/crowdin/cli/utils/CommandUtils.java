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
        if (file == null || StringUtils.isEmpty(file.getTranslation())) {
            throw new NullPointerException("null arg in CommandUtils.getTranslations()");
        }
        List<String> result = new ArrayList<>();
        for (Language projectLanguage : projectLanguages) {
            String langName = projectLanguage.getName();

            Language language = EntityUtils
                .find(supportedLanguages, l -> l.getName().equalsIgnoreCase(langName))
                .orElseThrow(() -> new RuntimeException("Language doesn't exist in supported languages"));

            if (lang != null && !lang.isEmpty() && !lang.equals(language.getId())) {
                continue;
            }


            String translations = file.getTranslation();
            translations = translations.replace(PLACEHOLDER_LANGUAGE, language.getName());
            translations = translations.replace(PLACEHOLDER_LOCALE, language.getLocale());
            translations = translations.replace(PLACEHOLDER_LOCALE_WITH_UNDERSCORE, language.getLocale().replace("-", "_"));
            translations = translations.replace(PLACEHOLDER_TWO_LETTERS_CODE, language.getTwoLettersCode());
            translations = translations.replace(PLACEHOLDER_THREE_LETTERS_CODE, language.getThreeLettersCode());
            translations = translations.replace(PLACEHOLDER_ANDROID_CODE, language.getAndroidCode());
            translations = translations.replace(PLACEHOLDER_OSX_LOCALE, language.getOsxLocale());
            translations = translations.replace(PLACEHOLDER_OSX_CODE, language.getOsxCode());

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
                temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_ORIGINAL_FILE_NAME, originalFileName);
                temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_FILE_NAME, fileNameWithoutExt);
                temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_FILE_EXTENTION, fileExt);
                temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_ORIGINAL_PATH, fileParent);
                temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_ANDROID_CODE, language.getAndroidCode());
                temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_OSX_CODE, language.getOsxCode());
                temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_OSX_LOCALE, language.getOsxLocale());
                if (sourceFile != null) {
                    if (sourceFile.equals(projectFile)) {
                        result.add(this.replaceDoubleAsteriskInTranslation(temporaryTranslation, f.getAbsolutePath(), file.getSource(), propertiesBean.getBasePath()));
                    }
                } else {
                    result.add(this.replaceDoubleAsteriskInTranslation(temporaryTranslation, f.getAbsolutePath(), file.getSource(), propertiesBean.getBasePath()));
                }
            }
        }

        return result;
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
