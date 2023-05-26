package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.cli.utils.Utils;
import com.crowdin.client.stringcomments.model.Type;
import org.apache.commons.lang3.StringUtils;
import org.apache.logging.log4j.util.Strings;
import picocli.CommandLine;

import java.util.ArrayList;
import java.util.List;

@CommandLine.Command(
        sortOptions = false,
        name = CommandNames.STRING_COMMENT
)
class StringCommentSubcommand extends ActCommandProject {

    @CommandLine.Option(names = {"--plain"}, descriptionKey = "crowdin.list.usage.plain")
    protected boolean plainView;

    @CommandLine.Parameters(descriptionKey = "crowdin.string.comment.text")
    protected String text;

    @CommandLine.Option(names = {"--string-id"}, paramLabel = "...", descriptionKey = "crowdin.string.comment.string-id")
    protected String stringId;

    @CommandLine.Option(names = {"-l", "--language"}, paramLabel = "...", descriptionKey = "crowdin.string.comment.language")
    protected String languageId;

    @CommandLine.Option(names = {"--type"}, paramLabel = "...", descriptionKey = "crowdin.string.comment.type")
    protected String type;

    @CommandLine.Option(names = {"--issue-type"}, paramLabel = "...", descriptionKey = "crowdin.string.comment.issue-type")
    protected String issueType;

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();
        if (Strings.isEmpty(stringId)) {
            errors.add(RESOURCE_BUNDLE.getString("error.comment_string_id_not_specified"));
        }
        if (Strings.isEmpty(languageId)) {
            errors.add(RESOURCE_BUNDLE.getString("error.comment_language_not_specified"));
        }
        if (com.crowdin.client.stringcomments.model.Type.COMMENT.toString().equalsIgnoreCase(
                type) && !StringUtils.isEmpty(issueType)) {
            errors.add(RESOURCE_BUNDLE.getString("error.comment_should_not_have_issue_type"));
        } else {
            try {
                Type.from(type);
            } catch (Exception e) {
                errors.add(RESOURCE_BUNDLE.getString("error.comment_type_not_specified_or_incorrect"));
            }
        }
        return errors;
    }

    @Override
    protected NewAction<ProjectProperties, ProjectClient> getAction(Actions actions) {
        return actions.stringComment(plainView, noProgress, text, stringId, languageId, type, issueType);
    }
}
