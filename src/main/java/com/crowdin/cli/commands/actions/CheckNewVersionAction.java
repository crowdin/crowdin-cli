package com.crowdin.cli.commands.actions;

import com.crowdin.cli.BaseCli;
import com.crowdin.cli.client.NoClient;
import com.crowdin.cli.commands.NewAction;
import com.crowdin.cli.commands.Outputter;
import com.crowdin.cli.properties.NoProperties;
import com.crowdin.cli.utils.Utils;
import org.apache.commons.io.IOUtils;
import org.apache.commons.lang3.StringUtils;

import java.io.IOException;
import java.net.URL;
import java.util.List;
import java.util.Optional;

class CheckNewVersionAction implements NewAction<NoProperties, NoClient> {

    @Override
    public void act(Outputter out, NoProperties pb, NoClient client) {
        getNewVersionMessage().ifPresent(out::println);
    }

    private static Optional<String> getAppNewLatestVersion() {
        try {
            List<String> versionFile = IOUtils.readLines(new URL(Utils.getLatestVersionUrl()).openStream(), "UTF-8");
            return (versionFile.size() > 0 && !Utils.getAppVersion().equals(versionFile.get(0)))
                ? Optional.of(versionFile.get(0))
                : Optional.empty();
        } catch (IOException e) {
            return Optional.empty();
        }
    }

    private static Optional<String> getNewVersionMessage() {
        String message2 = BaseCli.RESOURCE_BUNDLE.getString("message.new_version_text.2");
        String message3 = BaseCli.RESOURCE_BUNDLE.getString("message.new_version_text.3");
        String c1 = Utils.isWindows() ? "┌" : "\u256d";
        String c2 = Utils.isWindows() ? "┐" : "\u256e";
        String c3 = Utils.isWindows() ? "└" : "\u2570";
        String c4 = Utils.isWindows() ? "┘" : "\u256f";
        return getAppNewLatestVersion()
            .map(newVersion -> String.format(BaseCli.RESOURCE_BUNDLE.getString("message.new_version_text"), Utils.getAppVersion(), newVersion))
            .map(newVersionText ->
                "\n"
                    + "@|yellow " + c1 + "──" + StringUtils.repeat("─", message2.length())   + "──" + c2 + "|@\n"
                    + "@|yellow │|@  " + StringUtils.center(newVersionText, message2.length()) + "  @|yellow │|@\n"
                    + "@|yellow \u251c──" + StringUtils.repeat("─", message2.length())   + "──\u2524|@\n"
                    + "@|yellow │|@  " + StringUtils.center(message2, message2.length() + "@|cyan |@".length()) + "  @|yellow │|@\n"
                    + "@|yellow │|@  " + StringUtils.center(message3, message2.length())       + "  @|yellow │|@\n"
                    + "@|yellow " + c3 + "──" + StringUtils.repeat("─", message2.length())   + "──" + c4 + "|@");
    }
}
