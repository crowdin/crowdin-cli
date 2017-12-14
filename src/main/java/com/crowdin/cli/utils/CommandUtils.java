package com.crowdin.cli.utils;

import com.crowdin.Credentials;
import com.crowdin.Crwdn;
import com.crowdin.cli.BaseCli;
import com.crowdin.cli.properties.FileBean;
import com.crowdin.cli.properties.PropertiesBean;
import com.crowdin.cli.properties.helper.FileHelper;
import com.crowdin.client.CrowdinApiClient;
import com.crowdin.parameters.CrowdinApiParametersBuilder;
import com.sun.jersey.api.client.ClientResponse;
import net.lingala.zip4j.core.ZipFile;
import org.apache.commons.cli.CommandLine;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.zip.ZipEntry;

public class CommandUtils extends BaseCli {

    public static final String USER_HOME = "user.home";

    /*
    *
    * Return file ".crowdin.yaml" or ".crowdin.yml".
    *
    */
    public File getIdentityFile (CommandLine commandLine) {
        File identity = null;
        if (commandLine == null) {
            return identity;
        }

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

    private File getIdentity (String fileName) {
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
        if (source.contains("**") || source.contains("*") || source.contains("?")
                || (source.contains("[") && source.contains("]")) || (source.contains("\\") && !Utils.isWindows())) {
            return true;
        } else {
            return false;
        }
    }

    public String replaceDoubleAsteriskInTranslation(String translations, String sources, String source,  PropertiesBean propertiesBean) {
        if (translations == null || translations.isEmpty()) {
            System.exit(0);
        }
        if (sources == null || sources.isEmpty()) {
            System.exit(0);
        }
        if (translations.contains("**")) {
            sources = Utils.replaceBasePath(sources, propertiesBean);
            String replacement = "";
            if (source.contains("**")) {
                if (source.contains("\\")) {
                    source = source.replaceAll("\\\\", "/");
                    source = source.replaceAll("/+", "/");
                }
                if (sources.contains("\\")) {
                    sources = sources.replaceAll("\\\\", "/");
                    sources = sources.replaceAll("/+", "/");
                }
                String[] sourceNodes = source.split("\\*\\*");
                for (int i=0; i<sourceNodes.length; i++) {
                    if (sources.contains(sourceNodes[i])) {
                        sources = sources.replaceFirst(sourceNodes[i], "");
                    } else if (sourceNodes.length - 1 == i) {
                        if (sourceNodes[i].contains("/")) {
                            String[] sourceNodesTmp = sourceNodes[i].split("/");
                            for(int j=0; j< sourceNodesTmp.length; j++) {
                                if (sources.contains(sourceNodesTmp[j])) {
                                    sources = sources.replaceFirst(sourceNodesTmp[j], "");
                                } else if (StringUtils.indexOfAny(sourceNodesTmp[j], new String[]{"*", "?", "[", "]", "."}) >= 0) {
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
            }
            translations = translations.replace("**", replacement);
            translations = translations.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);
        }
        return translations;
    }

    public List<String> getSourcesWithoutIgnores(FileBean file, PropertiesBean propertiesBean) {
        if (propertiesBean == null || file == null) {
            return Collections.emptyList();
        }

        FileHelper fileHelper = new FileHelper();
        List<File> sources = fileHelper.getFileSource(file, propertiesBean);
        List<File> sourcesWithoutIgnores = fileHelper.filterOutIgnoredFiles(sources, file, propertiesBean);

        List<String> result = new ArrayList<>();
        if (sourcesWithoutIgnores != null) {
            for (File source : sourcesWithoutIgnores) {
                if (source.isFile()) {
                    result.add(source.getAbsolutePath());
                }
            }
        }
        return result;
    }

    public String preserveHierarchy(FileBean file, String sourcePath, String commonPath, PropertiesBean propertiesBean,
                                    String branch, Credentials credentials, boolean isVerbose) {
        CrowdinApiParametersBuilder parametersBuilder = new CrowdinApiParametersBuilder();
        Parser parser = new Parser();
        CrowdinApiClient crwdn = new Crwdn();
        Set<String> directories = new HashSet<>();
        parametersBuilder.headers(HEADER_ACCEPT, HEADER_ACCAEPT_VALUE)
                .headers(HEADER_CLI_VERSION, HEADER_CLI_VERSION_VALUE)
                .headers(HEADER_JAVA_VERSION, HEADER_JAVA_VERSION_VALUE)
                .headers(HEADER_USER_AGENT, HEADER_USER_AGENT_VALUE);
        String[] nodes = null;
        StringBuilder dirs = new StringBuilder();
        StringBuilder resultDirs = new StringBuilder();
        String filePath = Utils.replaceBasePath(sourcePath, propertiesBean);
        if (filePath.startsWith(Utils.PATH_SEPARATOR)) {
            filePath = filePath.replaceFirst(Utils.PATH_SEPARATOR_REGEX, "");
        }
        if (!propertiesBean.getPreserveHierarchy()) {
            if (Utils.isWindows()) {
                if (filePath.contains("\\")) {
                    filePath = filePath.replaceAll("\\\\", "/");
                    filePath = filePath.replaceAll("/+", "/");
                }
                if (commonPath.contains("\\")) {
                    commonPath = commonPath.replaceAll("\\\\", "/");
                    commonPath = commonPath.replaceAll("/+", "/");
                }
            }
            if (filePath.startsWith(commonPath)) {
                filePath = filePath.replaceFirst(commonPath, "");
            } else if (filePath.startsWith("/" + commonPath)) {
                filePath = filePath.replaceFirst("/" + commonPath, "");
            }
            if (Utils.isWindows() && filePath.contains("/")) {
                filePath = filePath.replaceAll("/", Utils.PATH_SEPARATOR_REGEX);
            }
        }
        if (file.getDest() != null && !file.getDest().isEmpty() && !this.isSourceContainsPattern(file.getSource())) {
            if (propertiesBean.getPreserveHierarchy()) {
                if (file.getDest().contains(Utils.PATH_SEPARATOR)) {
                    nodes = file.getDest().split(Utils.PATH_SEPARATOR_REGEX);
                } else if (file.getDest().contains("\\")) {
                    nodes = file.getDest().split("\\\\");
                } else {
                    nodes = file.getDest().split("/");
                }
            }
        } else {
            if (filePath.contains(Utils.PATH_SEPARATOR)) {
                nodes = filePath.split(Utils.PATH_SEPARATOR_REGEX);
            } else if (filePath.contains("\\")) {
                nodes = filePath.split("\\\\");
            } else {
                nodes = filePath.split("/");
            }
        }
        if (nodes != null) {
            for (String node : nodes) {
                if (node != null && !node.isEmpty()) {
                    if (!node.equals(nodes[nodes.length - 1])) {
                        if (dirs.length() == 0) {
                            dirs.append(node);
                        } else {
                            dirs.append(Utils.PATH_SEPARATOR)
                                    .append(node);
                        }
                        if (resultDirs.length() == 0) {
                            resultDirs.append(node);
                        } else {
                            resultDirs.append(Utils.PATH_SEPARATOR)
                                    .append(node);
                        }
                        if (directories.contains(resultDirs.toString())) {
                            continue;
                        }
                        if (branch != null && !branch.isEmpty()) {
                            parametersBuilder.branch(branch);
                        }
                        parametersBuilder.json();
                        String directoryName = resultDirs.toString();
                        if (directoryName.indexOf(Utils.PATH_SEPARATOR) != -1) {
                            directoryName = directoryName.replaceAll(Utils.PATH_SEPARATOR_REGEX, "/");
                            directoryName = directoryName.replaceAll("/+","/");
                        }
                        parametersBuilder.name(directoryName);
                        JSONObject dir = null;
                        try {
                            directories.add(resultDirs.toString());
                            ClientResponse clientResponse;
                            clientResponse = crwdn.addDirectory(credentials, parametersBuilder);
                            dir = parser.parseJson(clientResponse.getEntity(String.class));
                            if (isVerbose) {
                                System.out.println(clientResponse.getHeaders());
                                System.out.println(dir);
                            }
                        } catch (Exception ex) {
                            System.out.println(RESOURCE_BUNDLE.getString("creating_directory") + " '" + parametersBuilder.getName() + "' failed");
                        }
                        if (branch != null && !branch.isEmpty()) {
                            directoryName = branch + "/" + directoryName;
                        }
                        if (dir != null && dir.getBoolean("success")) {
                            directories.add(resultDirs.toString());
                            System.out.println(RESOURCE_BUNDLE.getString("creating_directory") + " '" + directoryName + "' - OK");
                        } else if (dir != null && !dir.getBoolean("success") && dir.getJSONObject("error") != null && dir.getJSONObject("error").getInt("code") == 50
                                && "Directory with such name already exists".equals(dir.getJSONObject("error").getString("message"))) {
                            //SKIPPED
                            if (!directories.contains(resultDirs.toString())) {
                                System.out.println(RESOURCE_BUNDLE.getString("creating_directory") + " '" + directoryName + "' - SKIPPED");
                            }
                        } else {
                            System.out.println(RESOURCE_BUNDLE.getString("creating_directory") + " '" + directoryName + "' - ERROR");
                            if (dir != null) {
                                System.out.println(dir.getJSONObject("error").getString("message"));
                            }
                            System.exit(0);
                        }
                    }
                }
            }
        }
        return resultDirs.toString();
    }

    public PropertiesBean makeConfigFromParameters(CommandLine commandLine, PropertiesBean propertiesBean) {
        if (propertiesBean == null) {
            System.out.println(RESOURCE_BUNDLE.getString("error_property_bean_null"));
            System.exit(0);
        }
        if (commandLine == null) {
            System.out.println(RESOURCE_BUNDLE.getString("commandline_null"));
            System.exit(0);
        }
        FileBean fileBean = new FileBean();
        if (commandLine.getOptionValue("identifier") != null && !commandLine.getOptionValue("identifier").isEmpty()) {
            propertiesBean.setProjectIdentifier(commandLine.getOptionValue("identifier"));
        } else if (commandLine.getOptionValue("i") != null && !commandLine.getOptionValue("i").isEmpty()) {
            propertiesBean.setProjectIdentifier(commandLine.getOptionValue("i"));
        }
        if (commandLine.getOptionValue("key") != null && !commandLine.getOptionValue("key").isEmpty()) {
            propertiesBean.setApiKey(commandLine.getOptionValue("key"));
        } else if (commandLine.getOptionValue("k") != null && !commandLine.getOptionValue("k").isEmpty()) {
            propertiesBean.setApiKey(commandLine.getOptionValue("k"));
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
        Collections.sort(files,
                new Comparator<String>() {
                    @Override
                    public int compare(String f1, String f2) {
                        return f1.toString().compareTo(f2.toString());
                    }
                });
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

    public JSONObject getLanguageInfo(String language, JSONArray supportedLanguages) {
        if (language == null || language.isEmpty()) {
            System.exit(0);
        }
        if (supportedLanguages == null) {
            System.exit(0);
        }
        Parser parser = new Parser();
        JSONObject langInfo = new JSONObject();
        for (Object supportedLanguage : supportedLanguages) {
            JSONObject lang = parser.parseJson(supportedLanguage.toString());
            String langName = lang.getString("name");
            if (langName != null && language.equalsIgnoreCase(langName)) {
                langInfo.put("name", lang.getString("name"));
                langInfo.put("editor_code", lang.getString("editor_code"));
                langInfo.put("locale", lang.getString("locale"));
                langInfo.put("two_letters_code", lang.getString("iso_639_1"));
                langInfo.put("three_letters_code", lang.getString("iso_639_3"));
                langInfo.put("crowdin_code", lang.getString("crowdin_code"));
                langInfo.put("android_code", lang.getString("android_code"));
                langInfo.put("osx_code", lang.getString("osx_code"));
                langInfo.put("osx_locale", lang.getString("osx_locale"));
                break;
            }
        }
        return langInfo;
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
                        if (ep != null && !ep.startsWith(commonPath) && !this.isSourceContainsPattern(ep)) {
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
                    newFile.getParentFile().mkdirs();
                    if(!oldFile.renameTo(newFile)) {
                        if (newFile.delete()) {
                            if(!oldFile.renameTo(newFile)) {
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
                System.exit(0);
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
                System.exit(0);
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
                    extractingFiles.add(downloadedFile.replaceFirst("/" + branch + "/", ""));
                } else {
                    extractingFiles.add(downloadedFile);
                }
            }
        }
        List<String> sortedExtractingFiles = new ArrayList<>();
        for (Map.Entry<String, String> extractingMappingFile : mapping.entrySet()) {
            String k = extractingMappingFile.getKey();
            k = k.replaceAll("/+", "/");
            if (k.indexOf(Utils.PATH_SEPARATOR) != -1) {
                k = k.replaceAll(Utils.PATH_SEPARATOR_REGEX, "/");
                k = k.replaceAll("/+", "/");
            }
            if (k.indexOf("/") != -1) {
                k = k.replaceAll("/+", "/");
            }
            if (!propertiesBean.getPreserveHierarchy()) {
                if (k.startsWith(commonPath)) {
                    for (FileBean file : propertiesBean.getFiles()) {
                        String ep = file.getTranslation();
                        if (ep != null && !ep.startsWith(commonPath) && !this.isSourceContainsPattern(ep)) {
                            k = k.replaceFirst(commonPath, "");
                        }
                    }
                }
            }
            if (k.startsWith("/")) {
                k = k.replaceFirst("/", "");
            }
            String v = extractingMappingFile.getValue();
            if (v.indexOf(Utils.PATH_SEPARATOR) != -1) {
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
                System.exit(0);
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
        } catch (IOException e) {}
        return downloadedFiles;
    }

    private Map<String, String> map(String translations, String mappingTranslations, JSONObject languageInfo, FileBean file, String placeholder, String pattern) {
        if (file == null || languageInfo == null) {
            return null;
        }
        if (translations == null || mappingTranslations == null) {
            return null;
        }
        Map<String, String> result = new HashMap<>();
        boolean isMapped = false;
        String localWithUnderscore = null;
        if (PLACEHOLDER_LOCALE_WITH_UNDERSCORE.equals(pattern)) {
            localWithUnderscore = languageInfo.getString(placeholder).replace("-", "_");
            translations = translations.replace(pattern, localWithUnderscore);
        }
        if (PLACEHOLDER_ANDROID_CODE.equals(pattern)) {
            translations = translations.replace(pattern, languageInfo.getString("android_code"));
        } else if (PLACEHOLDER_OSX_CODE.equals(pattern)) {
            translations = translations.replace(pattern, languageInfo.getString("osx_code"));
        } else if (PLACEHOLDER_OSX_LOCALE.equals(pattern)) {
            translations = translations.replace(pattern, languageInfo.getString("osx_locale"));
        } else {
            translations = translations.replace(pattern, languageInfo.getString(placeholder));
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
                if (languageInfo.getString("crowdin_code").equals(hashMap.getKey())) {
                    mappingTranslations = mappingTranslations.replace(pattern, hashMap.getValue());
                    isMapped = true;
                    break;
                }
            }
        }
        if (!isMapped) {
            String replacement;
            if (PLACEHOLDER_ANDROID_CODE.equals(pattern)) {
                replacement = languageInfo.getString("android_code");
            } else if (PLACEHOLDER_OSX_CODE.equals(pattern)) {
                replacement = languageInfo.getString("osx_code");
            }else if (PLACEHOLDER_OSX_LOCALE.equals(pattern)) {
                replacement = languageInfo.getString("osx_locale");
            } else {
                replacement = (localWithUnderscore == null) ? languageInfo.getString(placeholder) : localWithUnderscore;
            }
            mappingTranslations = mappingTranslations.replace(pattern, replacement);
        }
        result.put(translations, mappingTranslations);
        return result;
    }

    public Map<String, String> doLanguagesMapping(JSONObject projectInfo, JSONArray supportedLanguages, PropertiesBean propertiesBean, String lang) {
        Map<String, String> mapping = new HashMap<>();
        JSONArray projectLanguages = projectInfo.getJSONArray("languages");
        Parser parser = new Parser();

        // Iterating the project is slow, so fetch all source files up-front, not once per translation.
        Map<FileBean, List<String>> sourcesByFileBean = new IdentityHashMap<>();
        List<FileBean> files = propertiesBean.getFiles();
        for (FileBean file : files) {
            sourcesByFileBean.put(file, getSourcesWithoutIgnores(file, propertiesBean));
        }

        for (Object projectLanguage : projectLanguages) {
            JSONObject languages = parser.parseJson(projectLanguage.toString());
            String languageName = languages.getString("name");
            if (languageName != null && !languageName.isEmpty()) {
                JSONObject languageInfo = this.getLanguageInfo(languageName, supportedLanguages);
                if (lang != null && !lang.isEmpty()) {
                    if (!lang.equals(languageInfo.getString("crowdin_code"))) {
                        continue;
                    }
                }
                for (FileBean file : files) {
                    List<String> projectFiles = sourcesByFileBean.get(file);
                    String translationsBase = file.getTranslation();
                    String translationsMapping = file.getTranslation();
                    if (translationsBase != null && !translationsBase.isEmpty()) {
                        if (translationsBase.contains(PLACEHOLDER_LANGUAGE)) {
                            Map<String, String> locale = this.map(translationsBase, translationsMapping, languageInfo, file, "name", PLACEHOLDER_LANGUAGE);
                            if (locale != null) {
                                for (Map.Entry<String, String> language: locale.entrySet()) {
                                    translationsBase = language.getKey();
                                    translationsMapping = language.getValue();
                                }
                            }
                        }
                        if (translationsBase.contains(PLACEHOLDER_LOCALE)) {
                            Map<String, String> locale = this.map(translationsBase, translationsMapping, languageInfo, file, "locale", PLACEHOLDER_LOCALE);
                            if (locale != null) {
                                for (Map.Entry<String, String> language: locale.entrySet()) {
                                    translationsBase = language.getKey();
                                    translationsMapping = language.getValue();
                                }
                            }
                        }
                        if (translationsBase.contains(PLACEHOLDER_LOCALE_WITH_UNDERSCORE)) {
                            Map<String, String> undersoceLocale = this.map(translationsBase, translationsMapping, languageInfo, file, "locale", PLACEHOLDER_LOCALE_WITH_UNDERSCORE);
                            if (undersoceLocale != null) {
                                for (Map.Entry<String, String> language: undersoceLocale.entrySet()) {
                                    translationsBase = language.getKey();
                                    translationsMapping = language.getValue();
                                }
                            }
                        }
                        if (translationsBase.contains(PLACEHOLDER_TWO_LETTERS_CODE)) {
                            Map<String, String> twoLettersCode = this.map(translationsBase, translationsMapping, languageInfo, file, "two_letters_code", PLACEHOLDER_TWO_LETTERS_CODE);
                            if (twoLettersCode != null) {
                                for (Map.Entry<String, String> language: twoLettersCode.entrySet()) {
                                    translationsBase = language.getKey();
                                    translationsMapping = language.getValue();
                                }

                            }
                        }
                        if (translationsBase.contains(PLACEHOLDER_THREE_LETTERS_CODE)) {
                            Map<String, String> threeLettersCode = this.map(translationsBase, translationsMapping, languageInfo, file, "three_letters_code", PLACEHOLDER_THREE_LETTERS_CODE);
                            if (threeLettersCode != null) {
                                for (Map.Entry<String, String> language: threeLettersCode.entrySet()) {
                                    translationsBase = language.getKey();
                                    translationsMapping = language.getValue();
                                }
                            }
                        }
                        if (translationsBase.contains(PLACEHOLDER_ANDROID_CODE)) {
                            Map<String, String> androidCode = this.map(translationsBase, translationsMapping, languageInfo, file, "android_code", PLACEHOLDER_ANDROID_CODE);
                            if (androidCode != null) {
                                for (Map.Entry<String, String> language: androidCode.entrySet()) {
                                    translationsBase = language.getKey();
                                    translationsMapping = language.getValue();
                                }
                            }
                        }
                        if (translationsBase.contains(PLACEHOLDER_OSX_CODE)) {
                            Map<String, String> osxCode = this.map(translationsBase, translationsMapping, languageInfo, file, "osx_code", PLACEHOLDER_OSX_CODE);
                            if (osxCode != null) {
                                for (Map.Entry<String, String> language: osxCode.entrySet()) {
                                    translationsBase = language.getKey();
                                    translationsMapping = language.getValue();
                                }
                            }
                        }
                        if (translationsBase.contains(PLACEHOLDER_OSX_LOCALE)) {
                            Map<String, String> osxLocale = this.map(translationsBase, translationsMapping, languageInfo, file, "osx_locale", PLACEHOLDER_OSX_LOCALE);
                            if (osxLocale != null) {
                                for (Map.Entry<String, String> language: osxLocale.entrySet()) {
                                    translationsBase = language.getKey();
                                    translationsMapping = language.getValue();
                                }
                            }
                        }
                        if (translationsBase.contains(PLACEHOLDER_ORIGINAL_FILE_NAME)
                                || translationsBase.contains(PLACEHOLDER_FILE_NAME)
                                || translationsBase.contains(PLACEHOLDER_FILE_EXTENTION)
                                || translationsBase.contains(PLACEHOLDER_ORIGINAL_PATH)
                                || translationsBase.contains(PLACEHOLDER_ANDROID_CODE)
                                || translationsBase.contains(PLACEHOLDER_OSX_CODE)
                                || translationsBase.contains(PLACEHOLDER_OSX_LOCALE)){
                            for (String projectFile : projectFiles) {
                                File f = new File(projectFile);
                                String temporaryTranslation = translationsBase;
                                String temporaryTranslationsMapping = translationsMapping;
                                String fileParent = new File(f.getParent()).getAbsolutePath();
                                fileParent = Utils.replaceBasePath(fileParent, propertiesBean);
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
                                temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_ANDROID_CODE, languageInfo.getString("android_code"));
                                temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_OSX_CODE, languageInfo.getString("osx_code"));
                                temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_OSX_LOCALE, languageInfo.getString("osx_locale"));
                                String k = this.replaceDoubleAsteriskInTranslation(temporaryTranslation, f.getAbsolutePath(), file.getSource(), propertiesBean);
                                String v = this.replaceDoubleAsteriskInTranslation(temporaryTranslationsMapping, f.getAbsolutePath(), file.getSource(), propertiesBean);
                                k = k.replaceAll(Utils.PATH_SEPARATOR_REGEX, "/");
                                k = k.replaceAll("/+", "/");
                                if (file.getTranslationReplace() != null && !file.getTranslationReplace().isEmpty()) {
                                    v = this.doTranslationReplace(v, file.getTranslationReplace());
                                }
                                mapping.put(k, v);
                            }
                        } else {
                            if (projectFiles != null && !projectFiles.isEmpty()) {
                                String k = this.replaceDoubleAsteriskInTranslation(translationsBase, projectFiles.get(0), file.getSource(), propertiesBean);
                                String v = this.replaceDoubleAsteriskInTranslation(translationsMapping, projectFiles.get(0), file.getSource(), propertiesBean);
                                k = k.replaceAll(Utils.PATH_SEPARATOR_REGEX, "/");
                                k = k.replaceAll("/+", "/");
                                if (file.getTranslationReplace() != null && !file.getTranslationReplace().isEmpty()) {
                                    v = this.doTranslationReplace(v, file.getTranslationReplace());
                                }
                                mapping.put(k, v);
                            }
                        }
                    }
                }
            }
        }
        return mapping;
    }

    private String doTranslationReplace(String value, Map<String, String> translationReplace) {
        for (Map.Entry<String, String> translationReplaceEntry : translationReplace.entrySet()) {
            String translationReplaceKey = translationReplaceEntry.getKey();
            String translationReplaceValue = translationReplaceEntry.getValue();
            if (value.contains(translationReplaceKey)) {
                value = value.replace(translationReplaceKey, translationReplaceValue);
            }
        }
        return value;
    }

    public List<String> getTranslations(String lang, String sourceFile, FileBean file, JSONObject projectInfo,
                                        JSONArray supportedLanguages, PropertiesBean propertiesBean, String command) {
        List<String> result = new ArrayList<>();
        JSONArray projectLanguages = projectInfo.getJSONArray("languages");
        Parser parser = new Parser();
        for (Object projectLanguage : projectLanguages) {
            JSONObject language = parser.parseJson(projectLanguage.toString());
            String langName = language.getString("name");
            if (langName != null && !langName.isEmpty()) {
                JSONObject langsInfo = this.getLanguageInfo(langName, supportedLanguages);
                if (lang != null && !lang.isEmpty() && !lang.equals(langsInfo.getString("crowdin_code"))) {
                    continue;
                }
                if (file != null) {
                    String translations = file.getTranslation();
                    if (translations != null && !translations.isEmpty()) {
                        if (translations.contains(PLACEHOLDER_LANGUAGE)) {
                            translations = translations.replace(PLACEHOLDER_LANGUAGE, langsInfo.getString("name"));
                        }
                        if (translations.contains(PLACEHOLDER_LOCALE)) {
                            translations = translations.replace(PLACEHOLDER_LOCALE, langsInfo.getString("locale"));
                        }
                        if (translations.contains(PLACEHOLDER_LOCALE_WITH_UNDERSCORE)) {
                            String localWithUnderscore = langsInfo.getString("locale").replace("-", "_");
                            translations = translations.replace(PLACEHOLDER_LOCALE_WITH_UNDERSCORE, localWithUnderscore);
                        }
                        if (translations.contains(PLACEHOLDER_TWO_LETTERS_CODE)) {
                            translations = translations.replace(PLACEHOLDER_TWO_LETTERS_CODE, langsInfo.getString("two_letters_code"));
                        }
                        if (translations.contains(PLACEHOLDER_THREE_LETTERS_CODE)) {
                            translations = translations.replace(PLACEHOLDER_THREE_LETTERS_CODE, langsInfo.getString("three_letters_code"));
                        }
                        if (translations.contains(PLACEHOLDER_ANDROID_CODE)) {
                            translations = translations.replace(PLACEHOLDER_ANDROID_CODE, langsInfo.getString("android_code"));
                        }
                        if (translations.contains(PLACEHOLDER_OSX_LOCALE)) {
                            translations = translations.replace(PLACEHOLDER_OSX_LOCALE, langsInfo.getString("osx_locale"));
                        }
                        if (translations.contains(PLACEHOLDER_OSX_CODE)) {
                            translations = translations.replace(PLACEHOLDER_OSX_CODE, langsInfo.getString("osx_code"));
                        }
                        List<String> projectFiles = this.getSourcesWithoutIgnores(file, propertiesBean);
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
                                    fileParent = Utils.replaceBasePath(fileParent, propertiesBean);
                                }
                            } else {
                                fileParent = Utils.replaceBasePath(fileParent, propertiesBean);
                            }
                            fileParent = fileParent.replaceAll("/+", "/");
                            String androidLocaleCode = langsInfo.getString("android_code");
                            String osxLocaleCode = langsInfo.getString("osx_locale");
                            String osxCode = langsInfo.getString("osx_code");
                            temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_ORIGINAL_FILE_NAME, originalFileName);
                            temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_FILE_NAME, fileNameWithoutExt);
                            temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_FILE_EXTENTION, fileExt);
                            temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_ORIGINAL_PATH, fileParent);
                            temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_ANDROID_CODE, androidLocaleCode);
                            temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_OSX_CODE, osxCode);
                            temporaryTranslation = temporaryTranslation.replace(PLACEHOLDER_OSX_LOCALE, osxLocaleCode);
                            if (sourceFile != null) {
                                if (sourceFile.equals(projectFile)) {
                                    result.add(this.replaceDoubleAsteriskInTranslation(temporaryTranslation, f.getAbsolutePath(), file.getSource(), propertiesBean));
                                }
                            } else {
                                result.add(this.replaceDoubleAsteriskInTranslation(temporaryTranslation, f.getAbsolutePath(), file.getSource(), propertiesBean));
                            }
                        }
                    }
                }
            }
        }
        return result;
    }

    public JSONObject projectInfo(Credentials credentials, boolean isVerbose, boolean isDebug) {
        CrowdinApiClient crwdn = new Crwdn();
        Parser parser = new Parser();
        CrowdinApiParametersBuilder parameters = new CrowdinApiParametersBuilder();
        parameters.headers(HEADER_ACCEPT, HEADER_ACCAEPT_VALUE)
                .headers(HEADER_CLI_VERSION, HEADER_CLI_VERSION_VALUE)
                .headers(HEADER_JAVA_VERSION, HEADER_JAVA_VERSION_VALUE)
                .headers(HEADER_USER_AGENT, HEADER_USER_AGENT_VALUE);
        parameters.json();
        ClientResponse clientResponse = null;
        try {
            clientResponse = crwdn.getInfo(credentials, parameters);
        } catch (Exception e) {
            System.out.println(RESOURCE_BUNDLE.getString("wrong_connection"));
            if (isDebug) {
                e.printStackTrace();
            }
            System.exit(0);
        }
        if (isVerbose) {
            System.out.println(clientResponse.getHeaders());
        }
        String response = clientResponse.getEntity(String.class);
        JSONObject o = parser.parseJson(response);
        if (o != null && o.has("success") && !o.getBoolean("success")) {
            JSONObject error = o.getJSONObject("error");
            if (error != null) {
                System.out.println("ERROR");
                System.out.println("code: " + error.getInt("code"));
                System.out.println("message: " + error.getString("message"));
            }
            System.exit(0);
        }
        return o;
    }

    public JSONArray getSupportedLanguages(Credentials credentials, boolean isVerbose, boolean isDebug) {
        CrowdinApiClient crwdn = new Crwdn();
        Parser parser = new Parser();
        CrowdinApiParametersBuilder crowdinApiParametersBuilder = new CrowdinApiParametersBuilder();
        crowdinApiParametersBuilder.headers(HEADER_ACCEPT, HEADER_ACCAEPT_VALUE)
                .headers(HEADER_CLI_VERSION, HEADER_CLI_VERSION_VALUE)
                .headers(HEADER_JAVA_VERSION, HEADER_JAVA_VERSION_VALUE)
                .headers(HEADER_USER_AGENT, HEADER_USER_AGENT_VALUE);
        crowdinApiParametersBuilder.json();
        ClientResponse clientResponse = null;
        try {
            clientResponse = crwdn.getSupportedLanguages(credentials, crowdinApiParametersBuilder);
        } catch (Exception e) {
            System.out.println("\n" + RESOURCE_BUNDLE.getString("error_getting_supported_languages"));
            if (isDebug) {
                e.printStackTrace();
            }
            System.exit(0);
        }
        if (isVerbose) {
            System.out.println(clientResponse.getHeaders());
        }
        String response = clientResponse.getEntity(String.class);
        return parser.parseJsonArray(response);
    }

    public List<String> projectList(JSONArray files, String path) {
        List<String> result = new ArrayList<>();
        if (path == null) {
            path = Utils.PATH_SEPARATOR;
        }
        if (files != null) {
            String s = path;
            for (int i = 0; i < files.length(); i++) {
                JSONObject file = files.getJSONObject(i);
                if ("".equalsIgnoreCase(path)) {
                    path = s;
                }
                if (file != null && file.get("node_type") != null && ("branch".equals(file.get("node_type")) || "directory".equals(file.get("node_type")))) {
                    path += Utils.PATH_SEPARATOR + file.get("name").toString() + Utils.PATH_SEPARATOR;
                    path = path.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);
                    result.addAll(projectList(file.getJSONArray("files"), path));
                    path = "";
                } else if (file != null && file.get("node_type") != null && "file".equals(file.get("node_type"))) {
                    if (file.get("name") != null) {
                        result.add(path + file.get("name").toString());
                    }
                }
            }
        }
        return result;
    }

    public String getBaseUrl(PropertiesBean propertiesBean) {
        String baseUrl;
        if (propertiesBean.getBaseUrl() != null && !propertiesBean.getBaseUrl().isEmpty()) {
            baseUrl = propertiesBean.getBaseUrl();
            if (!(baseUrl.endsWith("/api") || baseUrl.endsWith("/api/"))) {
                baseUrl = baseUrl + "/api/";
                if (baseUrl.contains("://")) {
                    baseUrl = baseUrl.replaceAll("://", "%crwdn-url%");
                }
                baseUrl = baseUrl.replaceAll("/+", "/");
                if (baseUrl.contains("%crwdn-url%")) {
                    baseUrl = baseUrl.replaceAll("%crwdn-url%", "://");
                }
            }
        } else {
            baseUrl = Utils.getBaseUrl();
        }
        return baseUrl;
    }

    public String getBasePath(PropertiesBean propertiesBean, File configurationFile, boolean isDebug) {
        String basePath = propertiesBean.getBasePath();
        String result = null;
        if (basePath != null && Paths.get(basePath) != null) {
            if (Paths.get(basePath).isAbsolute()) {
                result = basePath;
            } else if (configurationFile != null && configurationFile.isFile()) {
                basePath = (basePath == null || ".".equals(basePath)) ? "" : basePath;
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
            }
        } else if (configurationFile != null && configurationFile.isFile()) {
            basePath = (basePath == null) ? "" : basePath;
            result =  Paths.get(configurationFile.getAbsolutePath()).getParent() + Utils.PATH_SEPARATOR + basePath;
            result = result.replaceAll(Utils.PATH_SEPARATOR_REGEX + "+", Utils.PATH_SEPARATOR_REGEX);
        }
        return result;
    }

    public String getCommonPath(List<String> sources, PropertiesBean propertiesBean) {
        String result = "";
        if (sources.size() == 1) {
            result = sources.get(0);
            if (result.contains(Utils.PATH_SEPARATOR)) {
                result = result.substring(0, result.lastIndexOf(Utils.PATH_SEPARATOR));
            } else if (Utils.isWindows() && result.contains("/")) {
                result = result.substring(0, result.lastIndexOf("/"));
            } else if (result.contains("\\")) {
                result = result.substring(0, result.lastIndexOf("\\"));
            }
            result = Utils.replaceBasePath(result, propertiesBean);
            if (result.startsWith(Utils.PATH_SEPARATOR)) {
                result = result.replaceFirst(Utils.PATH_SEPARATOR_REGEX, "");
            }
        } else if (sources.size() > 1) {
            String[] common = new String[sources.size()];
            common = sources.toArray(common);
            result = Utils.commonPath(common);
            result = Utils.replaceBasePath(result, propertiesBean);
            if (result.startsWith(Utils.PATH_SEPARATOR)) {
                result = result.replaceFirst(Utils.PATH_SEPARATOR_REGEX, "");
            }
            if (Utils.isWindows() && result.contains("\\")) {
                result = result.replaceFirst("\\\\", Utils.PATH_SEPARATOR_REGEX);
            }
        }
        return result;
    }
}