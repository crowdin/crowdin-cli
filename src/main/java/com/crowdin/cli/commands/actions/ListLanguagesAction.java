package com.crowdin.cli.commands.actions;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.CrowdinProjectInfo;
import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.PropertiesWithFiles;
import com.crowdin.cli.utils.console.ConsoleSpinner;
import com.crowdin.client.languages.model.Language;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

class ListLanguagesAction implements NewAction<PropertiesWithFiles, ProjectClient> {

    private BaseCli.LanguageCode code;
    private boolean noProgress;
    private boolean plainView;

    public ListLanguagesAction(BaseCli.LanguageCode code, boolean noProgress,  boolean plainView) {
        this.code = code;
        this.noProgress = noProgress || plainView;
        this.plainView = plainView;
    }

    @Override
    public void act(Outputter out, PropertiesWithFiles properties, ProjectClient client) {
        CrowdinProjectInfo project = ConsoleSpinner.execute(out, "message.spinner.fetching_project_info", "error.collect_project_info",
            this.noProgress, this.plainView, client::downloadProjectInfo);

        if (!plainView) {
            project.getProjectLanguages(true).stream()
                .map(lang -> String.format(RESOURCE_BUNDLE.getString("message.description"), lang.getName(), this.getCode(lang)))
                .map(OK::withIcon)
                .forEach(out::println);
        } else {
            project.getProjectLanguages(true).stream()
                .map(this::getCode)
                .forEach(out::println);
        }
    }

    private String getCode(Language language) {
        if (code == null) {
            return language.getTwoLettersCode();
        }
        switch (code) {
            case three_letters_code: return language.getThreeLettersCode();
            case locale: return language.getLocale();
            case android_code: return language.getAndroidCode();
            case osx_code: return language.getOsxCode();
            case osx_locale: return language.getOsxLocale();
            case two_letters_code:
            default: return language.getTwoLettersCode();
        }
    }
}
