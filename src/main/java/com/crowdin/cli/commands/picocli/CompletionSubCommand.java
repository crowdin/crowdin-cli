package com.crowdin.cli.commands.picocli;

import picocli.AutoComplete;
import picocli.CommandLine;

@CommandLine.Command(name = "completion", hidden = true)
class CompletionSubCommand extends AutoComplete.GenerateCompletion {
}
