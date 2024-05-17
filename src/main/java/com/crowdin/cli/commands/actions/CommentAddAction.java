package com.crowdin.cli.commands.actions;

import com.crowdin.cli.client.ProjectClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.commands.functionality.RequestBuilder;
import com.crowdin.cli.commands.picocli.ExitCodeExceptionMapper;
import com.crowdin.cli.properties.ProjectProperties;
import com.crowdin.client.stringcomments.model.AddStringCommentRequest;
import com.crowdin.client.stringcomments.model.StringComment;
import lombok.AllArgsConstructor;

import static com.crowdin.cli.BaseCli.RESOURCE_BUNDLE;
import static com.crowdin.cli.utils.console.ExecutionStatus.OK;

@AllArgsConstructor
class CommentAddAction implements NewAction<ProjectProperties, ProjectClient> {

    private final boolean plainView;
    private final String text;
    private final String stringId;
    private final String language;
    private final String type;
    private final String issueType;

    @Override
    public void act(Outputter out, ProjectProperties pb, ProjectClient client) {
        AddStringCommentRequest request = RequestBuilder.addComment(text, type, language, issueType, stringId);

        try {
            StringComment stringComment = client.commentString(request);

            if (!plainView) {
                out.println(OK.withIcon(
                        String.format(
                                RESOURCE_BUNDLE.getString("message.comment.list"),
                                stringComment.getId(),
                                stringComment.getText()
                        ))
                );
            } else {
                out.println(stringComment.getId().toString());
            }

        } catch (Exception e) {
            throw ExitCodeExceptionMapper.remap(e, String.format(RESOURCE_BUNDLE.getString("error.comment_is_not_added")));
        }
    }
}
