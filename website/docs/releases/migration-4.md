# Crowdin CLI v4

This guide is intended to highlight the most important changes in Crowdin CLI v4 and help you migrate from CLI v3 with ease. It is not a comprehensive guide, but rather a list of the most important changes.

:::tip
Need help or have questions? [Let's discuss it](https://github.com/crowdin/crowdin-cli/discussions/781)!
:::

## Command updates

### Init

The `generate` alias has been removed:

```diff
-crowdin generate
+crowdin init
```

### Lint

The `lint` command has been replaced with the [`config lint`](/commands/crowdin-config-lint) command.

```diff
- crowdin lint
+ crowdin config lint
```

### Pre-translate

We've made significant changes to the [`pre-translate`](/commands/crowdin-pre-translate) command. The command now requires the `file` parameter for file-based projects. The `file` parameter determines which files to pre-translate. Previously, the command relied on the current configuration, and it was only possible to pre-translate the files that matched the configuration patterns. Now you can specify any file(s) in the Crowdin project to pre-translate.

Tip: Use the [`file list`](/commands/crowdin-file-list) command to get the file paths in the current project.

### Branch

The `list branches` command has been replaced with the [`branch list`](/commands/crowdin-branch-list) command:

```diff
-crowdin list branches
+crowdin branch list
```

### File

* The `list project` command has been replaced with the [`file list`](/commands/crowdin-file-list) command.
* Added verbose (`--verbose`) output.
* Added a possibility to download translations for all project languages (`-l all`).

```diff
-crowdin list project
+crowdin file list
```

### String

* Added the `--branch` parameter support instead of specifying a branch in the file path in the `add` command.
* The [`string edit`](/commands/crowdin-string-edit) command changes:
  * moved `id` to parameter
  * now `identifier` is used as an option to edit and not to find the needed string.
* The [`string delete`](/commands/crowdin-string-delete) command changes:
  * moved `id` to parameter. Now only 1 string can be removed at a time
  * removed `text` and `identifier` options. Only `id` is used as a string identifier.
* Added `--directory` and `--scope` options to the [`string list`](/commands/crowdin-string-list) command.

```diff
-crowdin string add Download --file main/src/strings.xml --identifier "download"
+crowdin string add Download --file src/strings.xml --branch main --identifier "download"
```

```diff
-crowdin string edit --id 12 --text new
+crowdin string edit 12 --text new
```

```diff
-crowdin string delete --id 12
+crowdin string delete 12
```

### Language

* The `list languages` command has been replaced with the [`language list`](/commands/crowdin-language-list) command.
* Changed default `code` for list command. Now it's `id` instead of `two_letters_code`. It's more convenient since the `id` is used for the `--language` parameter in various commands.
* Added a new parameter `--all` which allows to list all languages for the current account.

```diff
-crowdin list languages
+crowdin language list
```

### List

* The `list sources` command has been replaced with the [`config sources`](/commands/crowdin-config-sources) command.
* The `list translations` command has been replaced with the [`config translations`](/commands/crowdin-config-translations) command.

```diff
-crowdin list sources
+crowdin config sources
```

```diff
-crowdin list translations
+crowdin config translations
```

With this change, it's now clearer that these commands will output the local sources and translations that match patterns in the configuration file.

### Glossary

The `name` property has been removed from the `upload` and `download` commands:

```diff
-crowdin glossary download --id <id>
-crowdin glossary download --name <name>
+crowdin glossary download <id>
```

```diff
-crowdin glossary upload <file> --name <name>
+crowdin glossary upload <file> --id <id>
```

Tip: Use the [`list`](/commands/crowdin-glossary-list) command to get the `id`.

### TM

The `name` property has been removed from `upload` and `download` commands:

```diff
-crowdin tm download --id <id>
-crowdin tm download --name <name>
+crowdin tm download <id>
```

```diff
-crowdin tm upload <file> --name <name>
+crowdin tm upload <file> --id <id>
```

Tip: Use the [`list`](/commands/crowdin-tm-list) command to get the `id`.

### Screenshot

The `name` parameter has been replaced with the `id` for the `delete` command because there can be multiple screenshots with the same name:

```diff
-crowdin screenshot delete <name>
+crowdin screenshot delete <id>
```

Tip: Use the [`list`](/commands/crowdin-screenshot-list) command to get the `id`.

## Deprecations and backward compatibility

### Download targets

The deprecated `download targets` command has been removed. The configuration file no longer supports the `targets` section as well. Use [Bundles](/commands/crowdin-bundle) instead.

### Task command

Removed backward compatibility for file numeric id in the [`task add`](/commands/crowdin-task-add) command. Now only file path is supported:

```diff
-crowdin task add --file 12 --language uk
+crowdin task add --file src/strings.xml --language uk
```

## Command output updates

In this release, we've also reviewed and improved the output of many commands to make them more informative and user-friendly. Changes include `list`, `add`, `upload`, `download`, `delete`, and other commands for various resources.
