---
description: Enable autocompletion so that the Crowdin CLI automatically completes your commands.
---

# Autocompletion

The bash completion script provided by Crowdin CLI is a utility that provides suggestions for Crowdin CLI commands and options within the terminal. This script can significantly improve the productivity of users who frequently work with Crowdin CLI by reducing the need to manually type commands and options.

To use the Crowdin CLI bash completion script, the user needs to run it in their bash shell. This can be done by using the `crowdin completion` command:

```bash
source <(crowdin completion)
```

Once the script is sourced, the user can start typing a Crowdin CLI command, and then hit the <kbd>Tab</kbd> key to get a list of possible completions. The list will include all valid options and arguments for the command, based on the user's input.

:::info
For [DEB](/installation#debian), [RPM](/installation#rpm), and [ArchLinux](/installation#arch-linux) packages of Crowdin CLI, the bash completion script will be automatically installed along with the main package during the installation process.
:::

You can also [download](https://github.com/crowdin/crowdin-cli/releases/latest/download/crowdin_completion) the bash completion script from the latest release of a Crowdin CLI GitHub repository or find it in the [Standalone version zip archive](/installation#standalone-version).

## Further Reading

- [Commands](/commands/crowdin)
