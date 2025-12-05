package com.crowdin.cli.commands.actions;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.CrowdinProject;
import com.crowdin.cli.client.LanguageMapping;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.picocli.ExitCodeExceptionMapper;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.languages.model.Language;

import java.util.List;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.PlaceholderUtil.PLACEHOLDER_ANDROID_CODE;
import static com.crowdin.cli.utils.PlaceholderUtil.PLACEHOLDER_LOCALE;
import static com.crowdin.cli.utils.PlaceholderUtil.PLACEHOLDER_OSX_CODE;
import static com.crowdin.cli.utils.PlaceholderUtil.PLACEHOLDER_OSX_LOCALE;
import static com.crowdin.cli.utils.PlaceholderUtil.PLACEHOLDER_THREE_LETTERS_CODE;
import static com.crowdin.cli.utils.PlaceholderUtil.PLACEHOLDER_TWO_LETTERS_CODE;
import static com.crowdin.cli.utils.console.ExecutionStatus.WARNING;

class LanguageListAction implements NewAction<ProjectProperties, ProjectClient> {

    private BaseCli.LanguageCode code;
    private boolean all;
    private boolean noProgress;
    private boolean plainView;

    public LanguageListAction(BaseCli.LanguageCode code, boolean all, boolean noProgress, boolean plainView) {
        this.code = code != null ? code : BaseCli.LanguageCode.id;
        this.all = all;
        this.noProgress = noProgress || plainView;
        this.plainView = plainView;
    }

    @Override
    public void act(Outputter out, ProjectProperties properties, ProjectClient client) {
        CrowdinProject project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
            this.noProgress, this.plainView, client::downloadProjectInfo);

        if (!project.isManagerAccess()) {
            if (!plainView) {
                out.println(WARNING.withIcon(RESOURCE_BUNDLE.getString("message.no_manager_access")));
                return;
            } else {
                throw new ExitCodeExceptionMapper.ForbiddenException(RESOURCE_BUNDLE.getString("message.no_manager_access"));
            }
        }

        LanguageMapping langMapping = project.getLanguageMapping();
        List<Language> languages = this.all ? client.listSupportedLanguages() : project.getProjectLanguages(true);

        if (!plainView) {
            languages.stream()
                .map(lang -> String.format(RESOURCE_BUNDLE.getString("message.language.list"), this.getCode(langMapping, lang), lang.getName()))
                .forEach(out::println);
        } else {
            languages.stream()
                .map(lang -> this.getCode(langMapping, lang))
                .forEach(out::println);
        }
    }

    private String getCode(LanguageMapping langMapping, Language language) {
        switch (code) {
            case three_letters_code:
                return langMapping.getValueOrDefault(language.getId(),
                    PLACEHOLDER_THREE_LETTERS_CODE.replaceAll("%", ""), language.getThreeLettersCode());
            case android_code:
                return langMapping.getValueOrDefault(language.getId(), PLACEHOLDER_ANDROID_CODE.replaceAll("%", ""), language.getAndroidCode());
            case locale:
                return langMapping.getValueOrDefault(language.getId(), PLACEHOLDER_LOCALE.replaceAll("%", ""), language.getLocale());
            case osx_code:
                return langMapping.getValueOrDefault(language.getId(), PLACEHOLDER_OSX_CODE.replaceAll("%", ""), language.getOsxCode());
            case osx_locale:
                return langMapping.getValueOrDefault(language.getId(), PLACEHOLDER_OSX_LOCALE.replaceAll("%", ""), language.getOsxLocale());
            case two_letters_code:
                return langMapping.getValueOrDefault(language.getId(),
                    PLACEHOLDER_TWO_LETTERS_CODE.replaceAll("%", ""), language.getTwoLettersCode());
            default:
                return language.getId();
        }
    }
}
