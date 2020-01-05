package com.crowdin.cli.commands;

import picocli.CommandLine;

@CommandLine.Command(name = "download", aliases = "pull", description = "Download latest translations from Crowdin and puts them to the specified place")
public class DownloadSubcommand extends GeneralCommand {
}
