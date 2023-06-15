---
description: Explore the Crowdin CLI FAQ page for quick answers to your questions. Find troubleshooting tips to optimize your Crowdin CLI experience.
---

# FAQ

### Downloaded translations don't match the current project configuration

I'm trying to download translations and I get the following error: `Downloaded translations don't match the current project configuration. The translations for the following sources will be omitted`.

**Answer:**

The issue is related to the *Resulting file after translations export* files configuration.

For CLI this export pattern should be the same as the `translation` pattern in the `crowdin.yml` configuration file. CLI passing it during the sources upload, but in case of files were uploaded in a **different way** or **patterns mismatch**, it should be specified manually or updated.

The best way to update the *Resulting file after translations export* - is to run sources upload via CLI. Another way - manually modify files settings in Crowdin.

It might affect some existing integrations because the files structure will change in an exported archive with translations.

### Due to missing respective sources, the following translations will be omitted

I'm trying to download translations and I get the following error: `Due to missing respective sources, the following translations will be omitted: ...`.

**Answer:**

It's related to the *Resulting file after translations export* files configuration in Crowdin. During the source push, the CLI will automatically set it, and it will be the same as the `translation` pattern of the `crowdin.yml` configuration file group. In the current case, the translation pattern is probably empty on the Crowdin side.

Possible workaround: run the `crowdin push` command to update the sources in the Crowdin project and set the correct translation export pattern.

### No sources found for pattern

Downloading sources doesn't work, getting the warning `No sources found for '***' pattern. Check the source paths in your configuration file`.

**Answer 1:**

Probably, the same issue as in [Downloaded translations don't match the current project configuration](/faq#downloaded-translations-dont-match-the-current-project-configuration).

**Answer 2:**

Check your `base_path` configuration. `base_path` configured in the `crowdin.yml` config should be **relative to the config location**, not the current directory. When CLI searching files it uses the `base_path` + `source` or `translation` pattern relative to the `crowdin.yml` location.

In case you need a base path related to the current working directory, probably you need to use the `--base-path` command parameter instead of `base_path` in config. The command parameter has a higher priority than config `base_path`.

```console
crowdin download -c ~/project/crowdin.yml --base-path "..."
```

### JSON: empty string keys

Empty strings keys appear after translations download for JSON file format ([#457](https://github.com/crowdin/crowdin-cli/issues/457), [#497](https://github.com/crowdin/crowdin-cli/issues/497), [#502](https://github.com/crowdin/crowdin-cli/issues/502))

**Answer:**

This is caused by using the *Skip untranslated strings* export option when some translations are missing. By default, Crowdin will export these keys but the value will be empty. If you need such untranslated strings to be trimmed completely from the exported JSON files, please [contact](https://crowdin.com/contacts) our Customer Success Service.

### PKIX path building failed

Crowdin CLI fails with an error `Java unable to find valid certification path to api.crowdin.com. ... PKIX path building failed`.

**Answer:**

This is an issue with the certificates and is not related to the CLI. Try the following options:

1) Renew the certificate on your PC: the mentioned errors could be related to the old certificate version;
2) Try to run the same CLI commands using another PC or laptop;
3) Run the CLI from the same machine, but fully change the directory and path (as the example: run CLI from another local disk instead of the current one, because there is a chance it's connected with disk permissions);
4) Connect to another network and try to run the same command;

[**Read more**](https://stackoverflow.com/questions/21076179/pkix-path-building-failed-and-unable-to-find-valid-certification-path-to-requ).
