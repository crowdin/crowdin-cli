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

<a class="btn btn-lg btn-success" href="https://crowdin.com/downloads/crowdin-cli.zip">Download for macOS, Linux and Windows</a>

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
4. Run <code>setup-crowdin.bat</code> script in order to add <code>crowdin</code> command to the <i>Command Promt</i>

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
### Contributing
1. Fork it
2. Create your feature branch (git checkout -b my-new-feature)
3. Commit your changes (git commit -am 'Added some feature')
4. Push to the branch (git push origin my-new-feature)
5. Create new Pull Request

### License and Author

Author: Crowdin (ihor.popyk@crowdin.com)

Copyright: 2016 crowdin.com

This project is licensed under the MIT license, a copy of which can be found in the LICENSE file.
