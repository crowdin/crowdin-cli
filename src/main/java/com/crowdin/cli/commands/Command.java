package com.crowdin.cli.commands;

import com.crowdin.cli.utils.MessageSource;
import picocli.CommandLine;

import java.util.ResourceBundle;

@CommandLine.Command(
        name = "crowdin",
        version = "3.0.5",
        mixinStandardHelpOptions = true,
        synopsisHeading = "%n@|underline SYNOPSIS|@:%n",
        descriptionHeading = "%n@|underline DESCRIPTION|@:%n",
        parameterListHeading = "%n@|underline PARAMETERS|@:%n",
        optionListHeading = "%n@|underline OPTIONS|@:%n",
        commandListHeading = "%n@|underline COMMANDS|@:%n",
        usageHelpAutoWidth = true
)
public class Command {

    protected static final ResourceBundle RESOURCE_BUNDLE = MessageSource.RESOURCE_BUNDLE;
}
