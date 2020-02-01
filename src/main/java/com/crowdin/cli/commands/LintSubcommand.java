package com.crowdin.cli.commands;

import com.crowdin.cli.commands.parts.PropertiesBuilderCommandPart;
import picocli.CommandLine;

@CommandLine.Command(name = "lint", description = "Check your configuration file")
public class LintSubcommand extends PropertiesBuilderCommandPart {

    @Override
    public Integer call() throws Exception {
        this.buildPropertiesBean();
        System.out.println(RESOURCE_BUNDLE.getString("configuration_ok"));
        return 0;
    }
}
