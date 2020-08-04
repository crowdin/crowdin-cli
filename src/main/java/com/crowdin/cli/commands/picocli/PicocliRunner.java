package com.crowdin.cli.commands.picocli;

import com.crowdin.cli.utils.OutputUtil;
import com.crowdin.cli.utils.Utils;
import picocli.CommandLine;

/**
 * Facade singleton class that is used to run <a href="https://picocli.info">picocli framework</a>.
 */
public class PicocliRunner {

    private static PicocliRunner INSTANCE;

    CommandLine commandLine;

    private PicocliRunner() {
        init();
    }

    public static PicocliRunner getInstance() {
        if (INSTANCE == null) {
            INSTANCE = new PicocliRunner();
        }
        return INSTANCE;
    }

    /**
     * Runs picocli with given arguments. Can be called multiple times.
     * @param args arguments from command line.
     * @return exit code (0 - OK, 1 - Errors)
     */
    public int execute(String... args) {
        return commandLine.execute(args);
    }

    public boolean hasMatchedArg(String name) {
        CommandLine.ParseResult parseResult = commandLine.getParseResult();
        return parseResult != null
            && ((parseResult.hasSubcommand())
                ? parseResult.subcommand().hasMatchedOption(name)
                : parseResult.hasMatchedOption(name));
    }

    private void init() {
        CommandLine.Help.ColorScheme colorScheme = buildColorScheme();
        CommandLine.IExecutionExceptionHandler executionExceptionHandler = buildExecutionExceptionHandler();
        this.commandLine = new CommandLine(new RootCommand())
            .setExecutionExceptionHandler(executionExceptionHandler)
            .setColorScheme(colorScheme);
        HelpCommand.setOptions(commandLine, System.out, colorScheme);
    }

    private static CommandLine.Help.ColorScheme buildColorScheme() {
        return new CommandLine.Help.ColorScheme.Builder()
            .commands(CommandLine.Help.Ansi.Style.fg_green)
            .options(CommandLine.Help.Ansi.Style.fg_green)
            .parameters(CommandLine.Help.Ansi.Style.fg_green)
            .errors(CommandLine.Help.Ansi.Style.fg_red)
            .build();
    }

    private static CommandLine.IExecutionExceptionHandler buildExecutionExceptionHandler() {
        return (ex, cmd, pr) -> {
            boolean isDebug = pr.originalArgs().contains("--debug");
            OutputUtil.fancyErr(ex, cmd.getErr(), isDebug);
            return cmd.getExitCodeExceptionMapper() != null
                ? cmd.getExitCodeExceptionMapper().getExitCode(ex)
                : cmd.getCommandSpec().exitCodeOnExecutionException();
        };
    }

    public static class VersionProvider implements CommandLine.IVersionProvider {
        @Override
        public String[] getVersion() {
            return new String[] {Utils.getAppVersion()};
        }
    }
}
