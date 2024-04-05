package com.crowdin.cli.commands.picocli;

import picocli.CommandLine;

@CommandLine.Command(
    name = "crowdin",
    subcommands = {
        UploadSubcommand.class,
        DownloadSubcommand.class,
        InitSubcommand.class,
        StatusSubcommand.class,
        StringSubcommand.class,
        GlossarySubcommand.class,
        TmSubcommand.class,
        TaskSubcommand.class,
        BundleSubcommand.class,
        CheckVersionSubcommand.class,
        PreTranslateSubcommand.class,
        BranchSubcommand.class,
        CommentSubcommand.class,
        DistributionSubcommand.class,
        ScreenshotSubcommand.class,
        LabelSubcommand.class,
        FileSubcommand.class,
        LanguageSubcommand.class,
        ConfigSubcommand.class
    })
class RootCommand extends HelpCommand {
    @Override
    protected CommandLine getCommand(CommandLine rootCommand) {
        return rootCommand;
    }
}
