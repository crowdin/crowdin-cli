package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.stringcomments.model.AddStringCommentRequest;
import com.crowdin.client.stringcomments.model.StringComment;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

class StringCommentAction implements NewAction<ProjectProperties, ProjectClient> {

    private final boolean plainView;
    private final boolean noProgress;
    private final String text;
    private final String stringId;
    private final String language;
    private final String type;
    private final String issueType;

    public StringCommentAction(boolean plainView, boolean noProgress, String text, String stringId, String language,
                               String type, String issueType) {
        this.plainView = plainView;
        this.noProgress = noProgress;
        this.text = text;
        this.stringId = stringId;
        this.language = language;
        this.type = type;
        this.issueType = issueType;
    }

    @Override
    public void act(Outputter out, ProjectProperties pb, ProjectClient client) {
        AddStringCommentRequest request = RequestBuilder.addComment(text, type, language, issueType, stringId);

        try {
            StringComment stringComment = client.commentString(request);

            if (!plainView) {
                out.println(
                        OK.withIcon(String.format(RESOURCE_BUNDLE.getString("message.comment.added"),
                                                  stringComment.getStringId(), stringComment.getText())));
            } else {
                out.println(stringComment.getStringId().toString());
            }
        } catch (Exception e) {
            throw new RuntimeException(String.format(RESOURCE_BUNDLE.getString("error.comment_is_not_added")), e);
        }
    }
}
