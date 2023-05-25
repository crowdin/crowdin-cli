package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.client.ClientComment;
import com.crowdin.cli.client.ClientTask;
import com.crowdin.cli.commands.Actions;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.functionality.PropertiesBeanUtils;
import com.crowdin.cli.properties.ProjectProperties;
import org.apache.logging.log4j.util.Strings;
import picocli.CommandLine;

import java.util.ArrayList;
import java.util.List;

@CommandLine.Command(
        name = CommandNames.COMMENT_RESOLVE
)
class CommentResolveSubcommand extends ActCommandComment {

    @CommandLine.Parameters(descriptionKey = "crowdin.comment.resolve.id")
    protected Long id;

    @Override
    protected NewAction<ProjectProperties, ClientComment> getAction(Actions actions) {
        return actions.resolve(id);
    }

    @Override
    protected List<String> checkOptions() {
        List<String> errors = new ArrayList<>();
        //TODO:
//        if (Strings.isEmpty(id)) {
//            errors.add(RESOURCE_BUNDLE.getString("error.comment.empty_id"));
//        }
        return errors;
    }

}
