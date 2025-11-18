package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.translations.model.AutoApproveOption;
import com.crowdin.client.translations.model.Method;
import org.apache.commons.lang3.StringUtils;
import picocli.CommandLine;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

@CommandLine.Command(
    name = CommandNames.PRE_TRANSLATE,
    sortOptions = false
)
public class PreTranslateSubcommand extends ActCommandWithFiles {

    @CommandLine.Option(names = {"-l", "--language"}, descriptionKey = "crowdin.pre-translate.language", paramLabel = "...", defaultValue = BaseCli.ALL, order = -2)
    protected List<String> languageIds;

    @CommandLine.Option(names = {"--file"}, descriptionKey = "crowdin.pre-translate.file", paramLabel = "...", order = -2)
    protected List<String> files;

    @CommandLine.Option(names = {"--method"}, descriptionKey = "crowdin.pre-translate.method", paramLabel = "...", required = true, order = -2)
    protected Method method;

    @CommandLine.Option(names = {"--engine-id"}, descriptionKey = "crowdin.pre-translate.engine-id", paramLabel = "...", order = -2)
    protected Long engineId;

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...", descriptionKey = "branch", order = -2)
    protected String branch;

    @CommandLine.Option(names = {"--directory"}, paramLabel = "...", order = -2, descriptionKey = "crowdin.pre-translate.directory-path")
    protected String directory;

    @CommandLine.Option(names = {"--auto-approve-option"}, descriptionKey = "crowdin.pre-translate.auto-approve-option", paramLabel = "...", order = -2)
    protected String autoApproveOption;

    @CommandLine.Option(names = {"--duplicate-translations"}, descriptionKey = "crowdin.pre-translate.duplicate-translations", negatable = true, order = -2)
    protected Boolean duplicateTranslations;

    @CommandLine.Option(names = {"--translate-untranslated-only"}, descriptionKey = "crowdin.pre-translate.translate-untranslated-only", negatable = true, order = -2)
    protected Boolean translateUntranslatedOnly;

    @CommandLine.Option(names = {"--translate-with-perfect-match-only"}, descriptionKey = "crowdin.pre-translate.translate-with-perfect-match-only", negatable = true, order = -2)
    protected Boolean translateWithPerfectMatchOnly;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @CommandLine.Option(names = {"--label"}, descriptionKey = "crowdin.pre-translate.label", paramLabel = "...", order = -2)
    protected List<String> labelNames;

    @CommandLine.Option(names = {"--ai-prompt"}, descriptionKey = "crowdin.pre-translate.ai-prompt", paramLabel = "...", order = -2)
    protected Long aiPrompt;

    private final Map<String, AutoApproveOption> autoApproveOptionWrapper = new HashMap<String, AutoApproveOption>() {{
        put("all", AutoApproveOption.ALL);
        put("except-auto-substituted", AutoApproveOption.EXCEPT_AUTO_SUBSTITUTED);
        put("perfect-match-only", AutoApproveOption.PERFECT_MATCH_ONLY);
        put("none", AutoApproveOption.NONE);
    }};

    @Override
    protected final boolean isAnsi() {
        return super.isAnsi() && !plainView;
    }

    @Override
    protected NewAction<PropertiesWithFiles, ProjectClient> getAction(Actions actions) {
        return actions.preTranslate(
            languageIds,
            files,
            method,
            engineId,
            branch,
            directory,
            autoApproveOptionWrapper.get(autoApproveOption),
            duplicateTranslations,
            translateUntranslatedOnly,
            translateWithPerfectMatchOnly,
            noProgress,
            plainView,
            labelNames,
            aiPrompt,
            isVerbose
        );
    }

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();
        if (directory != null && files != null && !files.isEmpty()) {
            errors.add(RESOURCE_BUNDLE.getString("error.pre_translate.directory_or_file_only"));
        }
        if ((Method.MT == method) && (engineId == null)) {
            errors.add(RESOURCE_BUNDLE.getString("error.pre_translate.engine_id"));
        }
        if ((Method.MT == method || Method.AI == method) && translateWithPerfectMatchOnly != null) {
            errors.add(RESOURCE_BUNDLE.getString("error.pre_translate.translate_with_perfect_match_only"));
        }
        if (Method.MT == method && autoApproveOption != null) {
            System.out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.warning.auto_approve_option_with_mt")));
            autoApproveOption = null;
        }
        if (autoApproveOption != null && !autoApproveOptionWrapper.containsKey(autoApproveOption)) {
            errors.add(RESOURCE_BUNDLE.getString("error.pre_translate.auto_approve_option"));
        }
        if ((Method.AI == method) && (aiPrompt == null)) {
            errors.add(RESOURCE_BUNDLE.getString("error.pre_translate.ai_prompt"));
        }
        if (files != null) {
            for (int i = 0; i < files.size(); i++) {
                String normalizedFile = StringUtils.removeStart(Utils.normalizePath(files.get(i)), Utils.PATH_SEPARATOR);
                files.set(i, normalizedFile);
            }
        }
        if (directory != null) {
            directory = StringUtils.removeStart(Utils.normalizePath(directory), Utils.PATH_SEPARATOR);
        }
        return errors;
    }
}
