[<p align="center"><img src="https://support.crowdin.com/assets/logos/crowdin-dark-symbol.png" data-canonical-src="https://support.crowdin.com/assets/logos/crowdin-dark-symbol.png" width="200" height="200" align="center"/></p>](https://crowdin.com)

# Crowdin CLI (v3)

Crowdin CLI is a command line tool that allows you to manage and synchronize your localization resources with your Crowdin project. Using CLI, you can:

- automate the process of updating your source files in your Crowdin project
- download translations from Crowdin and automatically save them in the correct locations
- upload all your existing translations to Crowdin in minutes
- integrate Crowdin with GIT, SVN, Mercurial, and other software

This is a cross-platform and it runs in a terminal on Linux based and macOS operating systems or in Command Prompt on Windows.

## Status

[![Build Status](https://dev.azure.com/crowdin/crowdin-cli-3/_apis/build/status/crowdin-cli-3?branchName=cli3)](https://dev.azure.com/crowdin/crowdin-cli-3/_build/latest?definitionId=10&branchName=cli3)
![Azure DevOps tests (branch)](https://img.shields.io/azure-devops/tests/crowdin/crowdin-cli-3/10/cli3)
![Azure DevOps coverage (branch)](https://img.shields.io/azure-devops/coverage/crowdin/crowdin-cli-3/10/cli3)
![GitHub](https://img.shields.io/github/license/crowdin/crowdin-cli-2)

## Table of Contents

* [What's New](#whats-new)
* [Building a crowdin-cli.jar](#building-a-crowdin-clijar)
* [Installation](#installation)
  * [Verifying Your Java Version](#verifying-your-java-version)
  * [Installation on Linux and macOS](#installation-on-linux-and-macos)
  * [Installation on Windows](#installation-on-windows)
* [Running the App](#running-the-app)
* [Configuration](#configuration)
* [Usage](#usage)
  * [General Commands](#general-commands)
  * [Uploading Resources](#uploading-resources)
* [Downloading Translations](#downloading-translations)
* [Versions Management](#versions-management)
* [Configuring Crowdin YAML](#configuring-crowdin-yaml)
* [Writing A Simple Configuration File](#writing-a-simple-configuration-file)
* [API Credentials from Environment Variables](#api-credentials-from-environment-variables)
* [Split Project Configuration and User Credentials](#split-project-configuration-and-user-credentials)
* [General Configuration](#general-configuration)
* [Placeholders](#placeholders)
* [Usage of Wildcards](#usage-of-wildcards)
* [Language Mapping](#language-mapping)
* [Ignoring Files and Directories](#ignoring-files-and-directories)
* [Multicolumn CSV](#multicolumn-csv)
* [Saving Directory Structure on Server](#saving-directory-structure-on-server)
* [Uploading Files to Specified Path with Specified Type](#uploading-files-to-specified-path-with-specified-type)
* [Changed Strings Update](#changed-strings-update)
* [Translations Upload](#translations-upload)
* [Additional Options for XML Files](#additional-options-for-xml-files)
* [Escape Quotes Options for .properties File Format](#escape-quotes-options-for-properties-file-format)
* [Example Configurations](#example-configurations)
  * [Uploading CSV files via API](#uploading-csv-files-via-api)
  * [GetText Project](#gettext-project)
  * [Android Project](#android-project)
* [Change log](#change-log)
* [Seeking Assistance](#seeking-assistance)
* [Contributing](#contributing)
* [Authors](#authors)
* [License](#license)

---

## What's New
* new type of YAML configuration
* configuration file validation with the help of `lint` command
* configuration file generation with the help of `init` command
* improved process of files upload
* possibility to work with a single file without a configuration
* `--dryrun` option to preview list of managed files


### Building a crowdin-cli.jar
You need to use Gradle for the project build.<br/>
First of all, refresh all dependencies.<br/>
Run the following command:
```
gradle buildCrowdinCliJar
```

## Installation

Crowdin CLI can be installed as a stand-alone Java application.

<a class="btn btn-lg btn-success" href="https://downloads.crowdin.com/cli/v2/crowdin-cli-three.zip">Download for macOS, Linux, and Windows</a>

### Verifying Your Java Version

Check if you have Java 8 or newer installed. Type java -version command in the terminal (Command Prompt on Windows) to check Java version.
For example, java version "1.8.0_212" means that you have Java 8 Update 212 installed.

If you don't have Java installed, download it from <a href="https://www.java.com/" target="_blank">Oracle's website</a>.

### Installation on Linux and macOS

1. Download **crowdin-cli.zip** using the button above
2. Unpack it
3. Run `. crowdin.sh` in the terminal with sudo rights to add `crowdin` command to your terminal

### Installation on Windows

1. Download <b>crowdin-cli.zip</b> using the button above
2. Extract its content to the place where you want Crowdin CLI to be stored
3. Open <i>Command Prompt</i> as an Administrator and do the following
  * click <b>Start</b>
  * in the <i>Start Search box</i>, type <b>cmd</b>, and then press CTRL+SHIFT+ENTER
  * if the <i>User Account Control</i> dialog box appears, check that action displayed is the one you need, and then click <b>Continue</b>
4. Run <code>setup_crowdin.bat</code> script in order to add <code>crowdin</code> command to the <i>Command Prompt</i>

## Running the App

Use the following method to run the app:
```
$ crowdin
```

Alternative method:
```
$ java -jar crowdin-cli.jar
```

![](https://support.crowdin.com/assets/docs/cli.png)

## Configuration

To use Crowdin CLI you need to have a configuration file. We recommend to name it _crowdin.yaml_. You can create it by running the command:

```
$ crowdin init
```

When calling Crowdin CLI in terminal make sure you are in your project root directory. Otherwise, you need to specify a configuration file path using  `--config` option:
```
$ crowdin upload sources --config /path/to/your/config/file
```

Run `crowdin help` to get more details on other commands.

Sample configuration file:
```
"project_id": "12"
"api_token": "54e01--your-personal-token--2724a"
"base_path" : "/your-base-path"
"base_url": "your-organization's-url"

"preserve_hierarchy": true

"files": [
  {
    "source" : "/t1/**/*",
    "translation" : "/%two_letters_code%/%original_file_name%"
  }
]
```

For more information how to configure Crowdin CLI, check <a href="https://support.crowdin.com/enterprise/configuration-file/" target="_blank">Configuration File</a> article.

## Usage

Once the configuration file is created, you can use Crowdin CLI to manage your localization resources and automate file synchronization.

### General Commands

To display help information:
```
$ crowdin help
```

To generate skeleton configuration file:
```
$ crowdin init
```

To check configuration file for general mistakes:
```
$ crowdin lint
```

To display a list of files uploaded to Crowdin:
```
$ crowdin list project
```

### Uploading Resources

To upload source files to Crowdin:
```
$ crowdin upload sources
```

To upload single file without configuration:
```
$ crowdin upload sources -s path/to/your/file -t file/export/pattern -pat personal-token -i project-id --base-url https://your-organization.crowdin.com
```
Use <a href="https://support.crowdin.com/enterprise/configuration-file/#placeholders" target="_blank">placeholders</a> to put appropriate variables.

To display a list of files that will be uploaded to Crowdin:
```
$ crowdin upload sources --dryrun
```

To upload existing translations to Crowdin (translations will be synchronized):
```
$ crowdin upload translations
```
To show detailed information about the `upload` command:
```
$ crowdin upload --help
```

## Downloading Translations

To download latest translations from Crowdin:
```
$ crowdin download
```

To download latest translations for the specific language (<a href="https://support.crowdin.com/api/language-codes/" target="_blank">language codes</a>):
```
$ crowdin download -l {language_code}
```

To display a list of latest translations from Crowdin:
```
$ crowdin download --dryrun
```

To show detailed information about the `download` command:
```
$ crowdin download --help
```

## Versions Management

There is no need to run specific command to create version branches if you sue synchronization tool. The version branch is created automatically during the files upload.

To upload source files to the specified version branch:
```
$ crowdin upload sources -b {branch_name}
```

To upload translations to the specified version branch:
```
$ crowdin upload translations -b {branch_name}
```

To download translations from the specified version branch:
```
$ crowdin download -b {branch_name}
```

## Configuring Crowdin YAML

Crowdin CLI uses YAML configuration file, which contains a description of all resources to manage. Config file consists of sections that contain the actual information about each file set that shall be uploaded to Crowdin and locations where the translations are stored. To use Crowdin CLI, you should first write your YAML config and then run the tool.
By default, Crowdin CLI looks for config file named _crowdin.yaml_. So you don’t have to specify the config name unless it is different from _crowdin.yaml_.
You can create it by running the command:

```
$ crowdin init
```

The goal of this article is to help you obtain, set up, and execute Crowdin CLI correctly for your project. Once you set up Crowdin CLI properly, you do not need to revisit this page, unless you’re starting another project.

## Configuration File Structure

Valid Crowdin CLI config file has the following structure:

*   your Crowdin project credentials, project preferences and access information (they are at the head of YAML file)
*   one exact element in files array that describes set of files you will manage
*   fields _Source_ and _Translation_ from files array that define filters for source files and contains instruction where to store translated files. It shall also specify where to look for translations when you want to upload them for the first time

## Writing A Simple Configuration File

```
"project_id": "12"                                                      #open your project and go to Resources > Integrations & API > API
"api_token": "54e01--your-personal-token--2724a"                        #click your profile photo > Account Settings > Access Tokens
"base_path" : "/your-base-path"
"base_url" : "your-organization's-url"

"files": [
  {
    "source" : "/resources/en/*.json",                                          #source files filter
    "translation" : "/resources/%two_letters_code%/%original_file_name%"        #where translations are stored
  }
]
```

**Note:** On Windows you should use Windows-style directory separator and according to YAML syntax it should be doubled:

```
{
"source" : "\\resources\\en\\*.json",
"translation" : "\\resources\\%two_letters_code%\\%original_file_name%"
}
```

To run the above configuration file and upload source files to Crowdin use the following call:
```
$ crowdin upload sources
```
Get translations from Crowdin:
```
$ crowdin download
```

## API Credentials from Environment Variables

You could load the API Credentials from environment variable. For example:

```
"project_id_env": CROWDIN_PROJECT_ID
"api_token_env": CROWDIN_PERSONAL_TOKEN
"base_path_env": CROWDIN_BASE_PATH
"base_url_env": CROWDIN_BASE_URL
```

If mixed, `api_token` and `project_id` have priority:

```
"project_id_env": CROWDIN_PROJECT_ID     # Low priority
"api_token_env": CROWDIN_PERSONAL_TOKEN  # Low priority
"base_path_env": CROWDIN_BASE_PATH       # Low priority
"base_url_env": CROWDIN_BASE_PATH        # Low priority
"project_id": "12"                       # High priority
"api_token": "your-personal-token"       # High priority
"base_path": "/your-base-path"           # High priority
"base_url": "your-organization's-url"    # High priority
```

## Split Project Configuration and User Credentials

_crowdin.yaml_ file contains project-specific configuration and user credentials (api_token, project_id, base_path, base_url). And you cannot commit this config file in the code repository, as the Personal access token would leak to other users. Crowdin CLI supports 2 types of configuration file:
+ project-specific, residing in the project directory (required)
+ user-specific, most probably residing in _$HOME/.crowdin.yaml_ (optional)

**NOTE**: User credentials in user-specific configuration file have higher priority than project-specific.

If you need to run command with user-specific credentials (e.g. `upload sources`) run the following command:
```
$ crowdin upload sources --identity 'path-to-user-credentials-file'
```

But if user-specific credentials file residing in _$HOME/.crowdin.yaml_ you can simply run:
```
$ crowdin upload sources
```

## General Configuration

Sample configuration provided above has source and translation attributes containing standard wildcards (also known as globbing patterns) to make it easier to work with multiple files.

Here are patterns you can use:

__\*__ (asterisk) – represents any character in file or directory name.
For example, if you specify "*.json" it will include all files like "messages.json", "about_us.json" and anything that ends with ".json".

__**__ (doubled asterisk) – matches any string recursively (including sub-directories). You can use _\*\*_ in both source and translation patterns.
When using _\*\*_ in the translation pattern, it will always contain sub-path from source to a certain file.
For example, you can use source: '/en/\*\*/*.po' to upload all *.po files to Crowdin recursively.
The translation pattern will be: '/%two_letters_code%/\*\*/%original_file_name%'.

**?** (question mark) – matches any single character.

**[set]** – matches any single character in a set. Behaves exactly like character sets in Regexp, including set negation ([^a-z]).

**\\** (backslash) – escapes next metacharacter.

## Placeholders

Crowdin CLI allows to use the following placeholders to put appropriate variables into the resulting file name:

<table class="table table-bordered">
  <thead>
    <tr>
      <th>Name</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>%language%</td>
      <td>Language name (i.e. Ukrainian)</td>
    </tr>
    <tr>
      <td>%two_letters_code%</td>
      <td>Language code ISO 639-1 (i.e. uk)</td>
    </tr>
    <tr>
      <td>%three_letters_code%</td>
      <td>Language code ISO 639-2/T (i.e. ukr)</td>
    </tr>
    <tr>
      <td>%locale%</td>
      <td>Locale (like uk-UA)</td>
    </tr>
    <tr>
      <td>%locale_with_underscore%</td>
      <td>Locale (i.e. uk_UA)</td>
    </tr>
    <tr>
      <td>%original_file_name%</td>
      <td>Original file name</td>
    </tr>
    <tr>
      <td>%android_code%</td>
      <td>Android Locale identifier used to name "values-" directories</td>
    </tr>
    <tr>
      <td>%osx_code%</td>
      <td>OS X Locale identifier used to name ".lproj" directories</td>
    </tr>
    <tr>
      <td>%original_path%</td>
      <td>Take parent folders names in Crowdin project to build file path in resulted bundle</td>
    </tr>
    <tr>
      <td>%file_extension%</td>
      <td>Original file extension</td>
    </tr>
    <tr>
      <td>%file_name%</td>
      <td>File name without extension</td>
    </tr>
  </tbody>
</table>


You can also define files path in the resulting archive by putting a slash (/) at the beginning of the pattern.

For example, your `translation` option can look like: "/locale/%two_letters_code%/LC_MESSAGES/%original_file_name%".

## Usage of Wildcards

Structure of files and directories on the local machine:
```
    - base_path
          |
          |-- folder
          |     |
          |     |-- 1.xml
          |     |-- 1.txt
          |     |-- 123.txt
          |     |-- 123_test.txt
          |     |-- a.txt
          |     |-- a1.txt
          |     |-- crowdin?test.txt
          |     |-- crowdin_test.txt
          |
          |-- 1.xml
          |-- 1.txt
          |-- 123.txt
          |-- 123_test.txt
          |-- a.txt
          |-- a1.txt
          |-- crowdin?test.txt
          |-- crowdin_test.txt
```

Example 1. Usage of wildcards in source path:

```
#........your project configuration........
"files" : [
  {
    "source" : "/**/?[0-9].txt", #upload a1.txt, folder/a1.txt
    "translation" : "/**/%two_letters_code%_%original_file_name%"
  },
  {
    "source" : "/**/*\?*.txt",  #upload crowdin?test.txt, folder/crowdin?test.txt
    "translation" : "/**/%two_letters_code%_%original_file_name%"
  },
  {
    "source" : "/**/[^0-2].txt",  #upload 3.txt, folder/3.txt, a.txt, folder/a.txt (ignore 1.txt, folder/1.txt)
    "translation" : "/**/%two_letters_code%_%original_file_name%"
  }
]
```

Example 2. Usage of wildcards for ignoring files:

```
#........your project configuration........

"files": [
  {
    "source" : "/**/*.*", #upload all files that  the base_path contains
    "translation" : "/**/%two_letters_code%_%original_file_name%",
    "ignore" : [
      "/**/?.txt",                      #ignore 1.txt, a.txt, folder/1.txt, folder/a.txt
      "/**/[0-9].txt",                  #ignore 1.txt, folder/1.txt
      "/**/*\\?*.txt",                   #ignore crowdin?test.txt, folder/crowdin?test.txt
      "/**/[0-9][0-9][0-9].txt",        #ignore 123.txt , folder/123.txt
      "/**/[0-9]*_*.txt"                #ignore 123_test.txt, folder/123_test.txt
    ]
  }
]
```

## Language Mapping

Software projects often have custom names for locale directories. Crowdin CLI allows you to map your languages to be recognized by Crowdin.

For example, if your locale directories are named 'en', 'uk', 'fr', 'de' all of them can be represented by the %two_letters_code% placeholder.
But if you have one directory named 'zh_CH' and you want to work with it using Crowdin CLI without changes you can add a `languages_mapping` section to your file set. Sample configuration:

```
#........your project configuration........

"files" : [
  {
    "source" : "/locale/en/**/*.po",
    "translation" : "/locale/%two_letters_code%/**/%original_file_name%",
    "languages_mapping" : {
      "two_letters_code" : {
        "ru" : "ros",
        "uk" : "ukr"
      }
    }
  }
]
```

Mapping format is: **"crowdin_language_code" : "code_you_use"**.
Check the <a href="https://support.crowdin.com/api/language-codes/" target="_blank">full list of Crowdin language codes</a> that can be used for mapping.

You can also override language codes for other placeholders (e.g. %android_code%, %locale%).

### Ignoring Files and Directories

If you have files and directories you don't need to translate in Crowdin you can add local per-file rules to project config file:

```
"files": [
  {
    "source" : "/**/*.properties",
    "translation" : "/**/%file_name%_%two_letters_code%.%file_extension%",
    "ignore" : [
      "/test/file.properties",
      "/example.properties"
    ]
  },
  {
    "source" : "/locale/en/**/*.po",
    "translation" : "/locale/%two_letters_code%/**/%original_file_name%",
    "ignore" : [
      "/locale/en/templates",
      "/locale/en/workflow"
    ]
  }
]
```

## Multicolumn CSV

If CSV file contains translations for all target languages, you can use `multilingual_spreadsheet` option:

```
"files": [
  {
    "multilingual_spreadsheet": true
  }  
]
```

CSV file example:

```
identifier,source_phrase,context,Ukrainian,Russian,French
ident1,Source 1,Context 1,,,
ident2,Source 2,Context 2,,,
ident3,Source 3,Context 3,,,
```

Configuration file example:

```
"files" : [
  {
    "source" : "multicolumn.csv",
    "translation" : "multicolumn.csv",
    "first_line_contains_header" : true,
    "scheme" : "identifier,source_phrase,context,uk,ru,fr",
    "multilingual_spreadsheet" : true
  }
]
```

## Saving Directory Structure on Server

```
"preserve_hierarchy": true
```

Example of file configuration using `preserve_hierarchy` option:

```
"project_id": "12"                                                      #open your project and go to Resources > Integrations & API > API
"api_token": "54e01--your-personal-token--2724a"                        #click your profile photo > Account Settings > Access Tokens
"base_url": "https://your-organization.crowdin.com"
"base_path": "/path/to/your/project"
"preserve_hierarchy": true

"files" : [
  {
    "source" : "/locale/en/**/*.po",
    "translation" : "/locale/%two_letters_code%/**/%original_file_name%"
  }
]
```

By default, directories that do not contain any files for translation will not be created in Crowdin. For example:
```
    - locale
        |
        |-- en
            |
            |-- foo.po
            |-- bar.po
```

By default, project files will be represented in Crowdin as following:
```
    - foo.po
    - bar.po
```
Using option `preserve_hierarchy`, file structure in Crowdin is the following:
```
    - en
      |
      |-- foo.po
      |-- bar.po
```

## Uploading Files to Specified Path with Specified Type

This feature adds support for 2 optional parameters in the YAML file section: `dest` and `type`.
This is useful typically for some projects, where the uploaded name must be different, so Crowdin can detect the type correctly.
The `dest` parameter allows you to specify a file name in Crowdin.

*Note!* The `dest` parameter only works for single files

Example of configuration file with both parameters:

```
"project_id": "12"                                                      #open your project and go to Resources > Integrations & API > API
"api_token": "54e01--your-personal-token--2724a"                        #click your profile photo > Account Settings > Access Tokens
"base_url": "https://your-organization.crowdin.com"
"base_path": "/home/office/source-code"

"files" : [
  {
    "source" : "/conf/messages",
    "dest" : "/messages.properties",
    "translation" : "/conf/messages.%two_letters_code%",
    "type" : "properties"
  },
  {
  "source" : "/app/strings.xml",
  "dest" : "/strings.xml",
  "translation" : "/res/values-%android_code%/%original_file_name%"
  }
]
```

## Changed Strings Update

The parameter `update_option` is optional. If it is not set, translations for changed strings will be lost. Useful for typo fixes and minor changes in source strings.

Depending on the value, `update_option` is used to preserve translations and preserve/remove validations of changed strings during file updates.

The values are:
*   **update_as_unapproved** – preserve translations of changed strings and remove validations of those translations if they exist
*   **update_without_changes** – preserve translations and validations of changed strings

Example of configuration file with update_option parameter:

```
"project_id": "12"                                                      #open your project and go to Resources > Integrations & API > API
"api_token": "54e01--your-personal-token--2724a"                        #click your profile photo > Account Settings > Access Tokens
"base_url": "https://your-organization.crowdin.com"
"base_path": "/home/office/source-code"

"files" : [
  {
    "source" : "/*.csv",
    "translation" : "/%three_letters_code%/%file_name%.csv",
    "first_line_contains_header" : true,
    "scheme" : "identifier,source_phrase,translation,context",
    "update_option" : "update_as_unapproved"
  },
  {
    "source": "/**/*.xlsx",
    "translation" : "/%three_letters_code%/folder/%file_name%.xlsx",
    "update_option" : "update_without_changes"
  }
]
```

## Translations Upload

The command **upload translations** adds existing translations to Crowdin.

The values are:

*   **-l, --language=language_code** – defines the language translations that should be uploaded to Crowdin. By default, translations are uploaded to all project's target languages. <a href="https://support.crowdin.com/api/language-codes/" target="_blank" >Crowdin Language Codes</a>
*   **--[no-]import-duplicates** – defines whether to add translation if there is the same translation already existing in Crowdin project
*   **--[no-]import-eq-suggestions** – defines whether to add translation if it is the same as the source string in Crowdin project
*   **--[no-]auto-approve-imported** – defines whether to automatically approve uploaded translations

Note: If no options specified, uploaded translations will be imported even if they are duplicated or if they are the same as the source strings. Such translations will not be approved.

### Additional Options for XML Files

<table class="additional-parameters-table table table-bordered">
  <tbody>
    <tr>
      <td><span style="white-space: nowrap;">translate_content</span><br><span class="parameter-type" style="color: #999">optional</span></td>
      <td>bool</td>
      <td>Defines whether to translate texts placed inside the tags. Acceptable values are: 0 or 1. Default is 1.</td>
    </tr>
    <tr>
      <td><span style="white-space: nowrap;">translate_attributes</span><br><span class="parameter-type" style="color: #999">optional</span></td>
      <td>bool</td>
      <td>Defines whether to translate tags attributes. Acceptable values are: 0 or 1. Default is 1.</td>
    </tr>
    <tr>
      <td><span style="white-space: nowrap;">content_segmentation</span><br><span class="parameter-type" style="color: #999">optional</span></td>
      <td>bool</td>
      <td>Defines whether to split long texts into smaller text segments. Acceptable values are: 0 or 1. Default is 1.
        <br>
        <strong>Note:</strong> If this option is enabled the possibility to upload existing translations for XML files will be disabled.
      </td>
    </tr>
    <tr>
      <td><span style="white-space: nowrap;">translatable_elements</span><br><span class="parameter-type" style="color: #999">optional</span></td>
      <td>array</td>
      <td>This is an array of strings, where each item is XPaths to DOM element that should be imported. <br>
        Sample path:  /path/to/node or /path/to/attribute[@attr]
        <br><b>Note:</b> If defined, the parameters <code>translate_content</code> and <code>translate_attributes</code> will be not taken into account while importing.</td>
    </tr>
  </tbody>
</table>

Example of configuration file with additional parameters:

```
"project_id": "12"                                                      #open your project and go to Resources > Integrations & API > API
"api_token": "54e01--your-personal-token--2724a"                        #click your profile photo > Account Settings > Access Tokens
"base_url": "https://your-organization.crowdin.com"
"base_path": "/home/office/source-code"

"files" : [
  {
    "source" : "/app/sample1.xml",
    "translation" : "/app/%locale%/%original_file_name%",
    "translate_attributes" : 1,
    "translate_content" : 0
  },
  {
    "source" : "/app/sample2.xml",
    "translation" : "/app/%locale%/%original_file_name%",
    "translatable_elements" : [
      "/content/text",             # translatable texts are stored in "text" nodes of parent node "content"
      "/content/text[@value]"      # translatable texts are stored in "value" attribute of "text" nodes
    ]
  }
]
```

## Escape Quotes Options for .properties File Format

Defines whether a single quote should be escaped by another single quote or backslash in exported translations.
You can add `escape_quote` per-file option.
Acceptable values are: 0, 1, 2, 3. Default is 3.

The values are:

*   **0** – do not escape single quote
*   **1** – escape single quote by another single quote
*   **2** – escape single quote by backslash
*   **3** – escape single quote by another single quote only in strings containing variables ( {0} )

Example of configuration file:

```
"project_id": "12"                                                      #open your project and go to Resources > Integrations & API > API
"api_token": "54e01--your-personal-token--2724a"                        #click your profile photo > Account Settings > Access Tokens
"base_url": "https://your-organization.crowdin.com"
"base_path": "/home/office/source-code"

"files" : [
  {
    "source" : "/en/strings.properties",
    "translation" : "/%two_letters_code%/%original_file_name%",
    "escape_quotes" : 1
  }
]
```


## Example Configurations

### Uploading CSV files via API

```
"project_id": "12"                                                      #open your project and go to Resources > Integrations & API > API
"api_token": "54e01--your-personal-token--2724a"                        #click your profile photo > Account Settings > Access Tokens
"base_url": "https://your-organization.crowdin.com"
"base_path": "/home/office/source-code"

"files" : [
  {
    "source" : "/*.csv",
    "translation" : "/%two_letters_code%/%original_file_name%",
    # Defines whether first line should be imported or it contains columns headers
    "first_line_contains_header" : true,
    # Used only when uploading CSV file to define data columns mapping.
    "scheme" : "identifier,source_phrase,translation,context,max_length"
  }
]
```

### GetText Project

```
"project_id": "12"                                                      #open your project and go to Resources > Integrations & API > API
"api_token": "54e01--your-personal-token--2724a"                        #click your profile photo > Account Settings > Access Tokens
"base_url": "https://your-organization.crowdin.com"
"base_path": "/home/office/source-code"

"files" : [
  {
    "source" : "/locale/en/**/*.po",
    "translation" : "/locale/%two_letters_code%/LC_MESSAGES/%original_file_name%",
    "languages_mapping" : {
      "two_letters_code" : {
        "zh-CN" : "zh_CH",
        "fr-QC": "fr"
      }
    }
  }
]
```

### Android Project

```
"project_id": "12"                                                      #open your project and go to Resources > Integrations & API > API
"api_token": "54e01--your-personal-token--2724a"                        #click your profile photo > Account Settings > Access Tokens
"base_url": "https://your-organization.crowdin.com"
"base_path": "/home/office/sandroid-app"

"files" : [
  {
    "source" : "/res/values/*.xml",
    "translation" : "/res/values-%android_code%/%original_file_name%",
    "languages_mapping" : {
      "android_code" : {
        "de" : "de",
        "ru" : "ru"
      }
    }
  }
]
```
## Change log

For latest changes check [CHANGELOG.md](CHANGELOG.md) file.

## Seeking Assistance

Need help working with Crowdin CLI or have any questions? <a href="https://crowdin.com/contacts" target="_blank">Contact Support Team</a>.


## Contributing
1. Fork it
2. Create your feature branch (git checkout -b my-new-feature)
3. Commit your changes (git commit -am 'Added some feature')
4. Push to the branch (git push origin my-new-feature)
5. Create new Pull Request

## Authors

* Ihor Popyk (ihor.popyk@crowdin.com)
* Yaroslav Medentsii (medentsiy.y@gmail.com)

## License
<pre>
Copyright © 2019 Crowdin

The Crowdin CLI is licensed under the MIT License. 
See the LICENSE.md file distributed with this work for additional 
information regarding copyright ownership.
</pre>
