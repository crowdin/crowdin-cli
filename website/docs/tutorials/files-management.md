---
description: Learn how to manage your project's localization files from the command line. Synchronize your source language files and translations with your Crowdin project.
---

# Files management

## Introduction

Crowdin CLI allows you to manage your project's localization files from the command line. You can easily synchronize your source language files and translations with your Crowdin project.

There are several commands you can use to manage your files. The CLI provides high-level commands that are easy to use and low-level commands that give you more flexibility and control.

The high level commands are [`crowdin upload`](/commands/crowdin-upload) and [`crowdin download`](/commands/crowdin-download). These commands are easy to use and they rely mostly on the configuration file.

The low-level commands include [`crowdin file upload`](/commands/crowdin-file-upload), [`crowdin file download`](/commands/crowdin-file-download), and [`crowdin file delete`](/commands/crowdin-file-delete). These commands are more like a lightweight wrapper over the [Crowdin API](https://developer.crowdin.com/api/v2/). They give you more flexibility and control over the file management process.

## The `upload` and `download` commands

### Configuration

These commands are usually being used along with the configuration file.

For example, you have a project with the following structure:

```bash
.
├── locales
│   ├── en
│   │   └── messages.xml
│   └── fr
│   │   └── messages.xml
│   └── de
│   │   └── messages.xml
│   └── uk
│       └── messages.xml
└── ...
```

Let's create a simple configuration file:

```bash
crowdin init -s "locales/en/*.xml" -t "locales/%two_letters_code%/%original_file_name%"
```

This command prompts you for the project identifier and API token. It will then create a configuration file with the following content:

```yaml
"project_id": "<your-crowdin-project-id>"
"api_token": "<your-personal-access-token>"
"base_path": "."
"base_url": "https://api.crowdin.com"

"preserve_hierarchy": true

files: [
  {
    "source": "locales/en/*.xml",
    "translation": "locales/%two_letters_code%/%original_file_name%"
  }
]
```

Let's take a closer look at some of the configuration options.

The `source` and `translation` configurations represent the patterns for the source and translation files. The `source` configuration is a [glob](https://en.wikipedia.org/wiki/Glob_(programming)) pattern pointing to the source files. The `translation` configuration is a path to the translation files (existing ones or where to put downloaded translations). The `%two_letters_code%` and `%original_file_name%` are the placeholders that will be replaced by the language code and the original source file name, respectively.

:::info
Visit the [Configuration](/configuration) page to learn more about the configuration file.
:::

### Upload content

Let's **upload** the source files and existing translations to Crowdin:

```bash
crowdin upload sources
crowdin upload translations -l fr
```

We can also check the translation and proofreading progress before downloading the translations:

```bash
crowdin status
```

### Download content

When the translations are ready, we can **download** them:

```bash
crowdin download translations
```

The above command will download all the translations to the path specified in the `translation` configuration.

:::tip
You can also use short aliases: `crowdin push`, `crowdin pull`.
:::

To download the source files from Crowdin, run the following command:

```bash
crowdin download sources
```

## The `file` command

The [`file`](/commands/crowdin-file) command is a low-level command that allows you to manage your files with more flexibility and control.

This command does not require a `files` section in the configuration file, or a configuration file at all. You can specify all the necessary parameters in the command itself.

### Upload content

Let's use the same project structure as in the previous example and try to **upload** the source files and existing translations to Crowdin:

```bash
crowdin file upload locales/en/messages.xml -d messages.xml
```

The command above will take the file `locales/en/messages.xml` and upload it to Crowdin as `messages.xml` in the root directory. The `-d`/`--dest` option stands for `destination` and allows you to specify the path to the file in Crowdin. If you omit the `-d` option, the file will be uploaded to the root directory with the same path as the source file.

You can upload strings to string-based projects as well:

```bash
crowdin file upload locales/en/messages.xml --branch main --cleanup-mode --update-strings
```

The `--branch` option is required for string-based projects. The `--cleanup-mode` and `--update-strings` options are optional. Use the `--update-strings` option to update strings with the same identifiers and the `--cleanup-mode` option to remove strings that are not present in the uploaded file.

To **upload translations** you need to specify the `-l`/`--language` option:

```bash
crowdin file upload locales/fr/messages.xml -d messages.xml -l fr
```

The `-d`/`--dest` option is the path to the file in Crowdin where the translations should be uploaded. `-l` - [Crowdin language code](https://developer.crowdin.com/language-codes/).

Visit the [`crowdin file upload`](/commands/crowdin-file-upload) page to see all the options available.

### Download content

Using the `crowdin file download` you can download either the source files or translations. Let's try to download the source file from Crowdin:

```bash
crowdin file download messages.xml -d locales/en/messages.xml
```

The above command will download the `messages.xml` file from Crowdin and store it in the `locales/en/messages.xml` path.

To download translations, you need to specify the `-l`/`--language` option:

```bash
crowdin file download messages.xml -d locales/fr -l fr
```

The `-d`/`--dest` option here is the path to the file on your local machine where the translations should be stored. `-l` - [Crowdin language code](https://developer.crowdin.com/language-codes/).

:::info
You can also use language code placeholders in the `--dest` option. For example, `locales/%android_code%`.
Available codes: `%two_letters_code%`, `%three_letters_code%`, `%locale%`, `%android_code%`, `%osx_code%`, `%osx_locale%`.
:::

Visit the [`crowdin file download`](/commands/crowdin-file-download) page to see all the available options.

:::tip
The `file` commands can easily be used without the configuration file. For example:

```bash
crowdin file upload locales/en/messages.xml \
  -d messages.xml \
  -i <your-project-id> \
  -T <your-personal-access-token> \
  /
```
:::

## Further Reading

- [Configuration](/configuration)
- [Advanced Usage](/advanced)
- [CI/CD Integration](/ci-cd)
- [FAQ](/faq)
