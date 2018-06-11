### Building a crowdin-cli.jar
For building the project you need to use Gradle.<br/>
First of all refresh all dependencies.<br/>
Run the command
```
gradle buildCrowdinCliJar
```
### Introduction
Crowdin CLI is a command line tool that allows you to manage and synchronize your localization resources with your Crowdin project:

- Automate the process of updating your source files in your Crowdin project
- Download translations from Crowdin and automatically save them in the correct locations
- Upload all your existing translations to Crowdin in minutes
- Integrate Crowdin with GIT, SVN, Mercurial and more…

This is a cross-platform and it runs in a terminal on Linux based and macOS operating systems or in Command Prompt on Windows.

<div class="bs-callout bs-callout-info">
  <h4>What's New</h4>
  <ul class="no-margin">
    <li>New type of YAML configuration</li>
    <li>Validation of a configuration file with the help of <code>lint</code> command</li>
    <li>Generation of a configuration file with the help of <code>generate</code> command</li>
    <li>Improved process of files upload</li>
    <li>Possibility to work with a single file without a configuration</li>
    <li><code>--dryrun</code> option to preview the list of managed files</li>
  </ul>
</div>

### Installation

Crowdin CLI can be installed as a stand-alone Java application.

<a class="btn btn-lg btn-success" href="https://downloads.crowdin.com/cli/v2/crowdin-cli.zip">Download for macOS, Linux and Windows</a>

#### Verifying Your Java Version

Check that you have Java 7 or newer installed. Type `java -version` command in the terminal (Command Prompt on Windows) to check Java version.
For example, *java version "1.7.0_55"* means that you have Java 7 Update 55 installed.

If you don't have Java installed, download it from <a href="https://www.java.com/" target="_blank">Oracle's website</a>.

#### Installation on Linux and macOS

1. Download **crowdin-cli.zip** using the button above
2. Unpack it
3. Run `. crowdin.sh` in the terminal with sudo rights in order to add `crowdin` command to your terminal

#### Installation on Windows

1. Download <b>crowdin-cli.zip</b> using the button above
2. Extract it's content to the place where you want Crowdin CLI to be stored
3. Open <i>Command Prompt</i> as an Administrator
  * Click <b>Start</b>
  * In the <i>Start Search box</i>, type <b>cmd</b>, and then press CTRL+SHIFT+ENTER
  * If the <i>User Account Control</i> dialog box appears, confirm that the action it displays is what you want, and then click <b>Continue</b>
4. Run <code>setup_crowdin.bat</code> script in order to add <code>crowdin</code> command to the <i>Command Promt</i>

### Running the App

Use the following method to run the app:
```
$ crowdin
```

Alternative method:
```
$ java -jar crowdin-cli.jar
```

![](https://support.crowdin.com/assets/docs/cli.png)

### Configuration

To use Crowdin CLI you need to have a configuration file. We recommend to name it _crowdin.yaml_. You can create it running the command:

```
$ crowdin generate
```

When calling Crowdin CLI in terminal you should be in your project root directory. Otherwise, you will have to specify a configuration file path using the `--config` option:
```
$ crowdin upload sources --config /path/to/your/config/file
```

Run `crowdin help` to get more details regarding other commands.

Sample configuration file:
```
"project_identifier" : "your-project-identifier"
"api_key" : "your-api-key"
"base_path" : "your-base-path"

"preserve_hierarchy": true

"files": [
  {
    "source" : "/t1/**/*",
    "translation" : "/%two_letters_code%/%original_file_name%"
  }
]
```

For more information how to configure Crowdin CLI, check the <a href="https://support.crowdin.com/configuration-file/#cli-2" target="_blank">Configuration File</a> article.

### Usage

Once the configuration file is created, you are ready to start using Crowdin CLI to manage your localization resources and automate file synchronization.

#### General Commands

To display help information:
```
$ crowdin help
```

To generate a skeleton configuration file:
```
$ crowdin generate
```

To check configuration file for general mistakes:
```
$ crowdin lint
```

To display a list of uploaded files to Crowdin:
```
$ crowdin list project
```

#### Uploading Resources

To upload source files to Crowdin:
```
$ crowdin upload sources
```

To upload a single file without configuration:
```
$ crowdin upload sources -s path/to/your/file -t file/export/pattern -k your-key -i your-identifier
```
Use <a href="https://support.crowdin.com/configuration-file/#placeholders" target="_blank">placeholders</a> to put appropriate variables.

To display a list of files that will be uploaded to Crowdin:
```
$ crowdin upload sources --dryrun
```

To upload existing translations to Crowdin (translations will be synchronized):
```
$ crowdin upload translations
```
To show a detailed information about the `upload` command:
```
$ crowdin upload --help
```

#### Downloading Translations

To download latest translations from Crowdin:
```
$ crowdin download
```

To download latest translations for the specific langauge (<a href="https://support.crowdin.com/api/language-codes/" target="_blank">language codes</a>):
```
$ crowdin download -l {language_code}
```

To display a list of latest translations from Crowdin:
```
$ crowdin download --dryrun
```

To show a detailed information about the `download` command:
```
$ crowdin download --help
```

### Versions Management

There is no need to run a specific command to create version branches if synchronization tool is used. The version branch will be created automatically during the files upload.

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

### Configuring Crowdin YAML

Crowdin CLI uses a YAML configuration file, which contains a description of the resources to manage. That config is structured into sections, which contain the actual information for each set of files to be uploaded to Crowdin and the locations where their translations are stored. To use Crowdin CLI, you should first write your YAML config, and then run the tool.
By default, Crowdin CLI looks for a config file named _crowdin.yaml_ (so you don’t have to specify the config name unless it is different than _crowdin.yaml_).
You can create it running the command:

```
$ crowdin generate
```

The goal of this article is to help you obtain, setup, and execute Crowdin CLI correctly for your project. Once you set up Crowdin CLI properly, you do not need to revisit this page, unless you’re starting another project.

### Configuration File Structure

A valid Crowdin CLI config file has the following structure:

*   Your Crowdin project credentials, project preferences and access information (they are at the head of YAML file)
*   Exactly one element in files array that describes set of the files you will manage
*   At least, fields _Source_ and _Translation_ from files array that define filters for source files and instruction where to store translated files (also, where to look for translations when you want to upload them for the first time)

See <a href="https://support.crowdin.com/api/api-integration-setup/" target="_blank">API Integration Setup</a> article to learn where to find your project credentials.

### Writing A Simple Configuration File

```
"project_identifier": "your-project-identifier"
"api_key": "54e01e81--your-api-key--f6a2724a"                                   #can be found in your project settings page
"base_path": "/home/office/source-code"

"files": [
  {
    "source" : "/resources/en/*.json",                                          #source files filter
    "translation" : "/resources/%two_letters_code%/%original_file_name%"        #where translations are stored
  }
]
```

**Notice:** On Windows you should use Windows-style directory separator and according to YAML syntax it should be doubled:

```
{
"source" : "\\resources\\en\\*.json",
"translation" : "\\resources\\%two_letters_code%\\%original_file_name%"
}
```

To run the above configuration file and upload source files to Crowdin is only a matter of calling:
```
$ crowdin upload sources
```
Get translations from Crowdin and put them to the right places:
```
$ crowdin download
```

### API Credentials from Environment Variables

You could load the API Credentials from an environment variable, e.g.:

```
"api_key_env": CROWDIN_API_KEY
"project_identifier_env": CROWDIN_PROJECT_ID
"base_path_env": CROWDIN_BASE_PATH
```

If mixed, api_key and project_identifier have priority:

```
"api_key_env": CROWDIN_API_KEY            # Low priority
"project_identifier_env": CROWDIN_PROJECT # Low priority
"base_path_env": CROWDIN_BASE_PATH        # Low priority
"api_key": "xxx"                          # High priority
"project_identifier": "yyy"               # High priority
"base_path": "zzz"                        # High priority
```

### Split Project Configuration and User Credentials

The _crowdin.yaml_ file contains project-specific configuration and user credentials (api_key, project_identifier, base_path). This means that you can't commit this file in the code repository, because the API key would leak to other users. Crowdin CLI supports 2 types of configuration file:
+ a project-specific, residing in the project directory (required)
+ a user-specific, probably residing in $HOME/.crowdin.yaml (optional)

NOTE: user credentials in user-specific configuration file are of higher priority than project-specific.

If you need to run command with user-specific credentials (for example `upload sources`) then run the following command:
```
$ crowdin upload sources --identity 'path-to-user-credentials-file'
```

But if user-specific credentials file residing in $HOME/.crowdin.yaml you can simple run:
```
$ crowdin upload sources
```

### General Configuration

The sample configuration provided above has source and translation attributes containing standard wildcards (also known as globbing patterns) to make it easier to work with multiple files.

Here are patterns you can use:

\* (asterisk)

Represents any character in file or directory name.
If you specify a "*.json" it will include all files like "messages.json", "about_us.json" and anything that ends with ".json".

** (doubled asterisk)

Matches any string recursively (including sub-directories). Note that you can use _\*\*_ in both source and translation patterns.
When using _\*\*_ in the translation pattern, it will always contain sub-path from source for a certain file.
For example, you can use source: '/en/\*\*/*.po' to upload all *.po files to Crowdin recursively.
The translation pattern will be '/%two_letters_code%/\*\*/%original_file_name%'.

**?** (question mark)

Matches any single character.

**[set]**

Matches any single character in a set. Behaves exactly like character sets in Regexp, including set negation ([^a-z]).

**\** (backslash)

Escapes the next metacharacter.

### Placeholders

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


You can also define the path for files in the resulting archive by putting a slash (/) at the beginning of the pattern.

Your `translation` option may look like: "/locale/%two_letters_code%/LC_MESSAGES/%original_file_name%".

### Usage of Wildcards

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

Example 1. Usage of wildcards in the source path:

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

### Language Mapping

Often software projects have custom names for locale directories. Crowdin CLI allows you to map your own languages to be recognizable for Crowdin.

Let's say your locale directories are named 'en', 'uk', 'fr', 'de'. All of them can be represented by the %two_letters_code% placeholder.
Still, you have one directory named 'zh_CH'. In order to make it work with Crowdin CLI without changes in your project you can add a `languages_mapping` section to your file set.

Sample configuration:

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

Mapping format is the following: **"crowdin_language_code" : "code_you_use"**.
Check the <a href="https://support.crowdin.com/api/language-codes/" target="_blank">full list of Crowdin language codes</a> that can be used for mapping.

You can also override language codes for other placeholders like %android_code%, %locale% etc.

### Ignoring Files and Directories

From time to time there are files and directories you don't need to translate in Crowdin. In such cases, local per-file rules can be added to the config file in your project.

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

### Multicolumn CSV

```
"files": [
  {
    "multilingual_spreadsheet": true
  }  
]
```

If a CSV file contains the translations for all target languages, you can use the option `multilingual_spreadsheet`.

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

### Saving Directory Structure on Server

```
"preserve_hierarchy": true
```

Example of file configuration using the `preserve_hierarchy` option:

```
"project_identifier": "test"
"api_key": "KeepTheAPIkeySecret"
"base_url": "https://api.crowdin.com"
"base_path": ""/path/to/your/project"
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
Using the option `preserve_hierarchy`, file structure in Crowdin will be the following:
```
    - en
      |
      |-- foo.po
      |-- bar.po
```

### Uploading Files to Specified Path with Specified Type

This feature adds support for 2 optional parameters in the yaml file section: `dest` and `type`.
This is useful typically for some projects, where the uploaded name must be different, so Crowdin can detect the type correctly.
The `dest` parameter allows you to specify a file name in Crowdin.

*Note!* The `dest` parameter only works for single files

Example of configuration file with both parameters:

```
"project_identifier": "your-project-identifier"
"api_key": "54e01e81--your-api-key--f6a2724a"           #can be found in your project settings page
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

### Changed Strings Update

The parameter `update_option` is optional. If it is not set, translations for changed strings will be lost. Useful for typo fixes and minor changes in source strings.

Depending on the value, `update_option` is used to preserve translations and preserve/remove validations of changed strings during file update.

The values are:
*   **update_as_unapproved** - preserve translations of changed strings and remove validations of those translations if they exist
*   **update_without_changes** - preserve translations and validations of changed strings

Example of configuration file with update_option parameter:

```
"project_identifier": "your-project-identifier"
"api_key": "54e01e81--your-api-key--f6a2724a"           #can be found in your project settings page
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

### Translations Upload

The command **upload translations** uploads existing translations to Crowdin.
If no options specified, uploaded translations will be imported even if they are duplicated or if they are equal with the source strings, and will not be approved.

The values are:

*   **-l, --language=language_code** - defines the language translations that should be uploaded to Crowdin.
By default, translations are uploaded to all project's target languages. <a href="https://support.crowdin.com/api/language-codes/" target="_blank" >Crowdin Language Codes</a>
*   **--[no-]import-duplicates** - defines whether to add translation if there is the same translation already existing in Crowdin project
*   **--[no-]import-eq-suggestions** - defines whether to add translation if it is equal to source string in Crowdin project
*   **--[no-]auto-approve-imported** - automatically approves uploaded translations

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
      <td>Defines whether to translate tags' attributes. Acceptable values are: 0 or 1. Default is 1.</td>
    </tr>
    <tr>
      <td><span style="white-space: nowrap;">content_segmentation</span><br><span class="parameter-type" style="color: #999">optional</span></td>
      <td>bool</td>
      <td>Defines whether to split long texts into smaller text segments. Acceptable values are: 0 or 1. Default is 1.
        <br>
        <strong>Important!</strong> This option disables the possibility to upload existing translations for XML files when enabled.
      </td>
    </tr>
    <tr>
      <td><span style="white-space: nowrap;">translatable_elements</span><br><span class="parameter-type" style="color: #999">optional</span></td>
      <td>array</td>
      <td>This is an array of strings, where each item is the XPaths to DOM element that should be imported. <br>
        Sample path:  /path/to/node or /path/to/attribute[@attr]
        <br><b>Note!</b> If defined, the parameters <code>translate_content</code> and <code>translate_attributes</code> are not taken into account while importing.</td>
    </tr>
  </tbody>
</table>

Example of configuration file with additional parameters:

```
"project_identifier": "your-project-identifier"
"api_key": "54e01e81--your-api-key--f6a2724a"           #can be found in your project settings page
"base_path": ""/home/office/source-code"

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

### Escape Quotes Options for .properties File Format

Defines whether a single quote should be escaped by another single quote or backslash in exported translations.
You can add `escape_quote` per-file option.
Acceptable values are: 0, 1, 2, 3. Default is 3.

The values are:

*   **0** - do not escape single quote
*   **1** - escape single quote by another single quote
*   **2** - escape single quote by backslash
*   **3** - escape single quote by another single quote only in strings containing variables ( {0} )

Example of configuration file:

```
"project_identifier": "your-project-identifier"
"api_key”: "54e01e81--your-api-key--f6a2724a"           #can be found in your project settings page
"base_path”: "/home/office/source-code"

"files" : [
  {
    "source" : "/en/strings.properties",
    "translation" : "/%two_letters_code%/%original_file_name%",
    "escape_quotes" : 1
  }
]
```


### Example Configurations

#### Uploading CSV files via API

```
"project_identifier": "test"
"api_key": "KeepTheAPIkeySecret"
"base_url": "https://api.crowdin.com"
"base_path": "/path/to/your/project"

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

#### GetText Project

```
"project_identifier": "your-project-identifier"
"api_key": "54e01e81--your-api-key--f6a2724a"           #can be found in your project settings page
"base_path": "/home/website"

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

#### Android Project

```
"project_identifier": "your-project-identifier"
"api_key": "54e01e81--your-api-key--f6a2724a"           #can be found in your project settings page
"base_path": "/home/android-app"

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
### Change log

**Version 2.0.23**
+ Fix bug with configuration loading from environment variables

**Version 2.0.22**
+ Fix bug with translation downloading

**Version 2.0.21**
+ osx_code updated

**Version 2.0.20**
+ escape round brackets

**Version 2.0.19**
+ ** in export pattern

**Version 2.0.18**
+ osx_locale
+ Cleaned `title`
+ Bugs fixed

**Version 2.0.17**
+ Performance improved (thanks to https://github.com/trejkaz)
+ Added short aliases for commands (push, pull)

**Version 2.0.16**
+ Bugs fixed
+ Added spell checker for commands

**Version 2.0.15**
+ Fix bug: improved work with wildcard in export pattern
+ Fix bug: improved work with language mapping
+ Fix bug: improved work with update source file with `dest` option
+ Added support of short option `-c` for set configuration file
+ Improved performance

**Version 2.0.14**
+ Fix bug: improved work with `preserve_hierarchy` option
+ Downloading translations for each language separately

**Version 2.0.12**
+ Fix bug: improved work with export pattern

**Version 2.0.11**
+ Fix bug: improved work with commands options
+ Fix bug: improved work with `**` in export pattern

**Version 2.0.10**
+ Fix bug: improved work with relative paths

**Version 2.0.9**
+ Fix bug: improved work with 'dest' option
+ Fix bug: language mapping processing
+ Fix bug: improved export pattern on Windows OS

**Version 2.0.8**
+ Fix bug: when download translations on Windows OS

**Version 2.0.7**
+ Fix bug: when download translations from branch

**Version 2.0.6**
+ Fix bug: when adding directories or branches with same names

### Seeking Assistance

Need help working with Crowdin CLI or have any questions? <a href="https://crowdin.com/contacts" target="_blank">Contact Support Team</a>.


### Contributing
1. Fork it
2. Create your feature branch (git checkout -b my-new-feature)
3. Commit your changes (git commit -am 'Added some feature')
4. Push to the branch (git push origin my-new-feature)
5. Create new Pull Request

### License and Author

Author: Ihor Popyk (ihor.popyk@crowdin.com)

Copyright: 2017 crowdin.com

This project is licensed under the MIT license, a copy of which can be found in the LICENSE file.
