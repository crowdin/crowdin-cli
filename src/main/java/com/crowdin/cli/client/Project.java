package com.crowdin.cli.client;

import com.crowdin.client.languages.model.Language;
import com.crowdin.client.sourcefiles.model.Branch;
import com.crowdin.client.sourcefiles.model.Directory;
import com.crowdin.client.sourcefiles.model.File;

import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface Project {

//    Optional<Language> getPseudoLanguage();
    Map<Long, Branch> getBranches();
    void addBranchToList(Branch branch);
    Map<Long, Directory> getDirectories();
    List<File> getFiles();

    Optional<Language> findLanguage(String id);
    Optional<Branch> findBranch(String branchName);
    Optional<File> findFile(String name, Long directoryId, Long branchId);

    List<Language> getSupportedLanguages();
    List<Language> getProjectLanguages(boolean withPseudoLang);

    Optional<Map<String, Map<String, String>>> getLanguageMapping();
}
