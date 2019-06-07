package com.crowdin.cli;

import com.crowdin.cli.commands.Commands;
import com.crowdin.cli.commands.CrowdinCliCommands;
import com.crowdin.cli.commands.CrowdinCliOptions;
import org.apache.commons.cli.CommandLine;
import org.apache.commons.cli.CommandLineParser;
import org.apache.commons.cli.DefaultParser;
import org.apache.commons.cli.Options;

public class Cli {

    public static void main(String[] args) {
        try {
            Options options = new CrowdinCliOptions().init();
            CommandLineParser parser = new DefaultParser();
            CommandLine commandLine = parser.parse(options, args);
            String command = new CrowdinCliCommands().init(commandLine);
            Commands c = new Commands();
            c.run(command, commandLine);
        } catch (Exception e) {
            System.out.println("Error: " + e.getMessage());
            System.exit(1);
        }
    }
}
