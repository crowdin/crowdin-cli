---
description: Unlock the full potential of the Crowdin CLI. Dive deeper into advanced techniques, tips, and tricks for leveraging the capabilities of the CLI tool.
---

# Advanced Usage

### Using CLI with Proxy Server

Crowdin CLI provides the possibility to work with a proxy server. Each time you run a command, Crowdin CLI checks whether the operating system has the configured environment variables.

Supported environment variables:

- `HTTP_PROXY_HOST` - the name or the IP address of the host at which the proxy server is located
- `HTTP_PROXY_PORT` - the port used by the proxy server for listening
- `HTTP_PROXY_USER` - the username used for authentication on a proxy server
- `HTTP_PROXY_PASSWORD` - the password used for authentication on a proxy server

### Attach labels to the uploaded strings

There are a few ways to attach labels to the uploaded strings using the Crowdin CLI:

1. Specify labels for each file-group in the `crowdin.yml` configuration file:

    ```yml title="crowdin.yml" {5-8}
    files: [
        {
            'source': '...',
            'translation': '...',
            'labels': [
                'main-menu',
                'application'
            ]
        }
    ]
    ```

2. Specify Labels as the [crowdin upload sources](/commands/crowdin-upload-sources) command options:

    ```bash
    crowdin upload sources -s "..." -t "..." --label "main-menu" -- label "application"
    ```

### Excluding target languages for uploaded sources

By default, the source files are available for translation into all target languages of the project. There is a possibility to specify the languages your file shouldn't be translated into:

```yml title="crowdin.yml"
'files': [
    {
        'source': '...',
        'translation': '...',
        // highlight-next-line
        'excluded_target_languages': ['uk', 'fr']
    }
]
```

Or using command options:

```bash
crowdin upload sources --excluded-language uk fr
```

### Languages mapping configuration

Often software projects have custom names for locale directories. Crowdin allows you to map your own languages to be recognizable in your projects.

Let's say your locale directories are named `en`, `uk`, `fr`, `de`. All of them can be represented by the `%two_letters_code%` placeholder. Still, you have one directory named `zh_CH`. You can also override language codes for other placeholders like `%android_code%`, `%locale%`, etc.

To set up Language Mapping in your configuration file, add the `languages_mapping` section to your file set as shown below:

```yml title="crowdin.yml"
"files": [
   {
      "source": "/locale/en/**/*.po",
      "translation": "/locale/%two_letters_code%/**/%original_file_name%",
      "languages_mapping": {
         "two_letters_code": {
            "uk": "ukr",
            "pl": "pol"
         }
      }
   }
]
```

Note that in the example above, we are configuring mapping for the `two_letters_code` placeholder because it is specified in the `translation` pattern. If you use a different language placeholder in your `translation` pattern, you should also specify this placeholder in the `languages_mapping` configuration.

:::caution
The mapping format is the following: `crowdin_language_code`: `code_you_use`. Check the full list of [Crowdin language codes](https://developer.crowdin.com/language-codes/) that can be used for mapping.
:::

:::tip
Languages Mapping can be also configured in your crowdin.com or Crowdin Enterprise _Project Settings_ > _Languages_ section.
:::

### Download Pseudo-localization

You can configure and download pseudo-localized translation files.

To download an archive with pseudo-localized translation files:

```bash
crowdin download --pseudo
```

Add the `pseudo_localization` section to your `crowdin.yml` configuration file with the following structure:

```yml title="crowdin.yml"
pseudo_localization: {
  length_correction: 25,
  prefix: "",
  suffix: "",
  character_transformation: "cyrillic"
}
```

Visit the [KB article](https://developer.crowdin.com/pseudolocalization/) to read more about Pseudo-Localiation.

### Export configuration for specific file formats

#### Java Properties

**Escape Quotes**

The `escape_quotes` option defines whether a single quote should be escaped by another single quote or backslash in exported translations. You can add the `escape_quotes` per-file option. Acceptable values are `0`, `1`, `2`, `3`. Default is `3`.

- `0` - do not escape
- `1` - escape single quote with another single quote
- `2` - escape single quote with a backslash
- `3` - escape single quote with another single quote only in strings containing variables ( {0} )

**Escape special characters**

Defines whether any special characters (`=`, `:`, `!` and `#`) should be escaped by a backslash in exported translations. You can add the `escape_special_characters` per-file option. Acceptable values are `0`, `1`. Default is `1`.

- `0` - do not escape special characters
- `1` - escape special characters by a backslash

Example of the configuration:

```yml title="crowdin.yml"
"files": [
  {
    "source": "/en/strings.properties",
    "translation": "/%two_letters_code%/%original_file_name%",
    "escape_quotes": 1,
    "escape_special_characters": 0
  }
]
```

#### JavaScript

**Export Quotes**

The `export_quotes` option defines the type of quotes to use in exported translations. You can add the `export_quotes` per-file option. Acceptable values are `single`, `double`. Default is `single`.

Example of the configuration:

```yml title="crowdin.yml"
"files": [
  {
    "source": "/en/strings.js",
    "translation": "/%two_letters_code%/%original_file_name%",
    "export_quotes": "double"
  }
]
```

### File Context

Add additional information or instructions to help translators better understand how to translate a file.
File context can be added as plain text or Markdown in File Settings > Context or directly in the Editor.
The provided context will be visible to translators in the Editor in the [File Context](https://support.crowdin.com/online-editor/#file-context) tab.
The  icon appears next to files that have file context added, helping you quickly identify which files include helpful notes for translators.

#### Limitations

File Context is only available for [file-based](https://support.crowdin.com/creating-project/#project-types) projects.

### Argument File

Crowdin CLI supports loading command-line arguments from a file.
The arguments can be stored in a plain text file and be passed to the CLI using the `@filename` syntax.

This can be useful when:
- You have a long list of options
- You want to reuse the same configuration
- You want to avoid issues with escaping special characters (like quotes) on Windows shells (PowerShell, cmd.exe)

#### How to use
Create a text file containing the arguments you would normally type in the command line.
Each argument must be separated by a new line.
In your CLI command, reference the file using `@` followed by the filename.

Example file (args.txt):
```
--branch feat
--directory src
```

Run CLI using file:

```bash
crowdin string list @args.txt
```

For PowerShell:

```powershell
crowdin string list "@args.txt"
```

### Multilingual Files

For multilingual file formats (containing multiple languages in one file) you can use the `multilingual` option in the configuration. This option allows you to omit the language placeholders in the `translation` pattern:

```yml title="crowdin.yml"
"files": [
  {
    "source": "Localizable.xcstrings",
    "translation": "Localizable.xcstrings",
    "multilingual": true
  }
]
```

### Configure export options for each file group

There is a way to specify export options for each file-group in the `crowdin.yml` configuration file:

```yml title="crowdin.yml"
files: [
     {
         'source': '...',
         'translation': '...',
         // highlight-next-line
         'skip_untranslated_strings': true # Skip untranslated strings
     },
     {
         'source': '...',
         'translation': '...',
         // highlight-next-line
         'skip_untranslated_files': true # Skip untranslated files
     },
     {
         'source': '...',
         'translation': '...',
         // highlight-next-line
         'export_only_approved': true # Export only approved
     },
     { # Only for Crowdin Enterprise
         'source': '...',
         'translation': '...',
         // highlight-next-line
         'export_string_that_passed_workflow': true # Export only strings that passed workflow
     },
]
```

### Ignore hidden files during upload sources

To ignore hidden files during sources upload, add the following to your configuration file:

```yml title="crowdin.yml"
settings: {
    "ignore_hidden_files": false
}
```

Default value - `true`.
