package com.crowdin.cli.client;

import com.crowdin.client.stringcomments.model.IssueStatus;
import com.crowdin.client.stringcomments.model.StringComment;

import java.util.List;

public interface ClientComment extends Client {

    List<StringComment> listComment(String stringId, com.crowdin.client.stringcomments.model.Type type,
                                    com.crowdin.client.issues.model.Type issueType, IssueStatus issueStatus);

    StringComment resolve(Long commentId);
}
