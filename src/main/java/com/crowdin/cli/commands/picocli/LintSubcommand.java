package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name = "lint")
public class LintSubcommand extends Command {

    @CommandLine.Mixin
    private PropertiesBuilderCommandPart propertiesBuilderCommandPart;

    @Override
    public void run() {
        propertiesBuilderCommandPart.buildPropertiesBean();
        System.out.println(RESOURCE_BUNDLE.getString("message.configuration_ok"));
    }
}
