package com.crowdin.cli.commands;

import com.crowdin.cli.commands.parts.PropertiesBuilderCommandPart;
import picocli.CommandLine;

@CommandLine.Command(
    name = "lint",
    customSynopsis = "@|fg(yellow) crowdin lint|@ [CONFIG OPTIONS] [OPTIONS]",
    description = "Analyze your configuration file for potential errors")
public class LintSubcommand extends PropertiesBuilderCommandPart {

    @Override
    public void run() {
        this.buildPropertiesBean();
        System.out.println(RESOURCE_BUNDLE.getString("configuration_ok"));
    }
}
