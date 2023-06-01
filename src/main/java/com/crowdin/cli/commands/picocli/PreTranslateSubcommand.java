package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.client.translations.model.AutoApproveOption;
import com.crowdin.client.translations.model.Method;
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

    @CommandLine.Option(names = {"-l", "--language"}, paramLabel = "...", defaultValue = BaseCli.ALL, order = -2)
    protected List<String> languageIds;

    @CommandLine.Option(names = {"--method"}, paramLabel = "...", required = true, order = -2)
    protected Method method;

    @CommandLine.Option(names = {"--engine-id"}, paramLabel = "...", order = -2)
    protected Long engineId;

    @CommandLine.Option(names = {"-b", "--branch"}, paramLabel = "...", descriptionKey = "branch", order = -2)
    protected String branch;

    @CommandLine.Option(names = {"--auto-approve-option"}, paramLabel = "...", order = -2)
    protected String autoApproveOption;

    @CommandLine.Option(names = {"--duplicate-translations"}, negatable = true, order = -2)
    protected Boolean duplicateTranslations;

    @CommandLine.Option(names = {"--translate-untranslated-only"}, negatable = true, order = -2)
    protected Boolean translateUntranslatedOnly;

    @CommandLine.Option(names = {"--translate-with-perfect-match-only"}, negatable = true, order = -2)
    protected Boolean translateWithPerfectMatchOnly;

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

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
            method,
            engineId,
            branch,
            autoApproveOptionWrapper.get(autoApproveOption),
            duplicateTranslations,
            translateUntranslatedOnly,
            translateWithPerfectMatchOnly,
            noProgress,
            debug,
            isVerbose,
            plainView
        );
    }

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();
        if ((Method.MT == method) == (engineId == null)) {
            errors.add(RESOURCE_BUNDLE.getString("error.pre_translate.engine_id"));
        }
        if ((Method.MT == method) && duplicateTranslations != null) {
            errors.add(RESOURCE_BUNDLE.getString("error.pre_translate.duplicate_translations"));
        }
        if ((Method.MT == method) && translateUntranslatedOnly != null) {
            errors.add(RESOURCE_BUNDLE.getString("error.pre_translate.translate_untranslated_only"));
        }
        if ((Method.MT == method) && translateWithPerfectMatchOnly != null) {
            errors.add(RESOURCE_BUNDLE.getString("error.pre_translate.translate_with_perfect_match_only"));
        }
        if (Method.MT == method && autoApproveOption != null) {
            System.out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.warning.auto_approve_option_with_mt")));
            autoApproveOption = null;
        }
        if (autoApproveOption != null && !autoApproveOptionWrapper.containsKey(autoApproveOption)) {
            errors.add(RESOURCE_BUNDLE.getString("error.pre_translate.auto_approve_option"));
        }
        return errors;
    }
}
