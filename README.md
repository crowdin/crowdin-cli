[<p align="center"><img src="https://support.crowdin.com/assets/logos/crowdin-dark-symbol.png" data-canonical-src="https://support.crowdin.com/assets/logos/crowdin-dark-symbol.png" width="200" height="200" align="center"/></p>](https://crowdin.com)

# Crowdin CLI [![Tweet](https://img.shields.io/twitter/url/http/shields.io.svg?style=social)](https://twitter.com/intent/tweet?url=https%3A%2F%2Fgithub.com%2Fcrowdin%2Fcrowdin-cli&text=Crowdin%20CLI%20is%20an%20open-source%20command-line%20tool%20that%20allows%20you%20to%20manage%20and%20synchronize%20your%20localization%20resources%20with%20your%20Crowdin%20project)

Crowdin CLI is a command line tool that allows you to manage and synchronize your localization resources with your Crowdin project. Using CLI, you can:

- automate the process of updating your source files in your Crowdin project
- download translations from Crowdin and automatically save them in the correct locations
- upload all your existing translations to Crowdin in minutes
- integrate Crowdin with GIT, SVN, Mercurial, and other software

This is a cross-platform and it runs in a terminal on Linux based and macOS operating systems or in Command Prompt on Windows.

## Status

[![Build Status](https://dev.azure.com/crowdin/crowdin-cli-3/_apis/build/status/Build%20and%20Test?branchName=cli3)](https://dev.azure.com/crowdin/crowdin-cli-3/_build/latest?definitionId=22&branchName=cli3&cacheSeconds=1000)
[![Docker Pulls](https://img.shields.io/docker/pulls/crowdin/cli?logo=docker&cacheSeconds=2000)](https://hub.docker.com/r/crowdin/cli)
[![npm](https://img.shields.io/npm/dt/@crowdin/cli?logo=npm&cacheSeconds=2000)](https://www.npmjs.com/package/@crowdin/cli)
![Azure DevOps tests (branch)](https://img.shields.io/azure-devops/tests/crowdin/crowdin-cli-3/22/cli3?cacheSeconds=2000)
[![codecov](https://codecov.io/gh/crowdin/crowdin-cli/branch/cli3/graph/badge.svg)](https://codecov.io/gh/crowdin/crowdin-cli)
[![GitHub contributors](https://img.shields.io/github/contributors/crowdin/crowdin-cli?cacheSeconds=1000)](https://github.com/crowdin/crowdin-cli/graphs/contributors)
![GitHub](https://img.shields.io/github/license/crowdin/crowdin-cli?cacheSeconds=50000)

## Table of Contents

* [What's new](#whats-new)
* [Installation](#installation)
* [Running the App](#running-the-app)
* [Configuration](#configuration)
* [Usage](#usage)
  * [General Commands](#general-commands)
  * [Uploading Resources](#uploading-resources)
  * [Downloading Translations](#downloading-translations)
  * [Versions Management](#versions-management)
  * [Source strings management](#source-strings-management)
  * [Translation and proofreading progress](#translation-and-proofreading-progress)
* [Seeking Assistance](#seeking-assistance)
* [Contributing](#contributing)
* [Authors](#authors)
* [License](#license)

---

[<p align="center"><img src="https://raw.githubusercontent.com/crowdin/crowdin-cli/docs/cli.png" data-canonical-src="https://raw.githubusercontent.com/crowdin/crowdin-cli/docs/cli.png" width="700" height="auto" align="center"/></p>](https://crowdin.com)

## What's New

CLI v3 has a lot of updates and improvements:

- Available for Crowdin Enterprise
- Multithreading for source and translation files upload
- UX improvements: process indicators, loading states, emojis
- Interactive generation of a configuration file
- Bash/Zsh command completion
- Improved help screen for commands
- Improved configuration file validation
- More import options for `upload` command
- More export options for `download` command
- Based on the new RESTful Crowdin API v2

<details>
<summary><b>More</b></summary>

 - Memory and CPU optimization
 - Translations download progress
 - HTTP Proxy support including authorization
 - Support Language Mapping configured on Crowdin
 - `content_segmentation` option support for xml, html, md, fm_md, fm_html, flsnp, docx, idml, dita
 - `escape_special_characters` option support for properties file
 - `--dryrun` option for translations upload
 - `ignore` pattern improvements
 - Added notification about new version
 - Added `init` alias to `generate` command
 - Bug fixes and other improvements
 - Complete list of changes: [CHANGELOG.md](https://github.com/crowdin/crowdin-cli/blob/cli3/CHANGELOG.md)

 **Note**: for CLI v2 see the [branch](https://github.com/crowdin/crowdin-cli/tree/master).
 </details>

## Installation

### Requirements

Check if you have Java 8 or newer installed. Type `java -version` command in the terminal (Command Prompt on Windows) to check Java version.

For example, *java version "1.8.0_212"* means that you have Java 8 Update 212 installed.

<details>
<summary><b>Homebrew for macOS</b></summary>
To install the Crowdin CLI with homebrew (the package manager for macOS):

```console
brew tap crowdin/crowdin
```

```console
brew install crowdin@3
```

</details>

<details>
<summary><b>Windows</b></summary>

Download and run [installer for Windows](https://downloads.crowdin.com/cli/v3/crowdin.exe).

</details>

<details>
<summary><b>Debian</b></summary>

We sign all our packages with the Crowdin Signing Key.

Download and install the public signing key:

```console
wget -qO - https://artifacts.crowdin.com/repo/GPG-KEY-crowdin | sudo apt-key add -
```

Using the following command, create the *crowdin.list* file in the */etc/apt/sources.list.d* directory:

```console
echo "deb https://artifacts.crowdin.com/repo/deb/ /" > /etc/apt/sources.list.d/crowdin.list
```

And your repository is ready for use. You can install the Crowdin CLI Debian package with:

```console
sudo apt-get update && sudo apt-get install crowdin3
```

To install the Crowdin CLI manually:

```console
wget https://artifacts.crowdin.com/repo/deb/crowdin3.deb -O crowdin.deb
```

```console
sudo dpkg -i crowdin.deb
```

</details>

<details>
<summary><b>RPM</b></summary>

We sign all our packages with the Crowdin Signing Key.

Download and install the public signing key:

```console
rpm --import https://artifacts.crowdin.com/repo/GPG-KEY-crowdin
```

Installing from the RPM repository

Create a file called *crowdin.repo* in the */etc/yum.repos.d* directory containing:

*/etc/yum.repos.d/crowdin.repo*:
```ini
[crowdin]
name=Crowdin repository
baseurl=https://artifacts.crowdin.com/repo/rpm
gpgcheck=1
gpgkey=https://artifacts.crowdin.com/repo/GPG-KEY-crowdin
enabled=1
```

And your repository is ready for use. You can now install Crowdin CLI with one of the following commands:

```console
sudo yum install crowdin3
```

```console
sudo dnf install crowdin3
```

To install the Crowdin CLI manually:

```console
wget https://artifacts.crowdin.com/repo/rpm/crowdin3.rpm -O crowdin.rpm
```

```console
sudo rpm -U crowdin3.rpm
```

</details>

<details>
<summary><b>Arch Linux</b></summary>

Visit the Crowdin CLI [package page](https://aur.archlinux.org/packages/crowdin-cli/) on Arch Linux user  repository.

</details>

<details>
<summary><b>NPM</b></summary>

`npm i -g @crowdin/cli`

</details>

<details>
<summary><b>Standalone Version</b></summary>

Crowdin CLI can be installed as a stand-alone Java application.

[Download for MacOS, Linux and Windows](https://downloads.crowdin.com/cli/v3/crowdin-cli.zip)

#### Installation on Linux and macOS

- Download crowdin-cli.zip using the button above
- Unpack it
- Run `./install-crowdin-cli.sh` in the terminal with sudo rights in order to add crowdin command to your terminal

#### Installation on Windows

- Download *crowdin-cli.zip* using the button above
- Extract it's content to the place where you want Crowdin CLI to be stored
- Open *Command Prompt* as an Administrator
  - Click *Start*
  - In the *Start Search box*, type `cmd`, and then press `CTRL`+`SHIFT`+`ENTER`
  - If the *User Account Control* dialog box appears, confirm that the action it displays is what you want, and then click *Continue*
- Run `setup-crowdin.bat` script in order to add crowdin command to the *Command Prompt*
- Restart your *Command Prompt*

</details>

## Running the App

Use the following method to run the app:

```console
crowdin
```

Alternative method:

```console
java -jar crowdin-cli.jar
```

## Configuration

Crowdin CLI uses a YAML configuration file that contains a description of the resources to manage: files to be uploaded into Crowdin and the locations of the corresponding translations.

To use Crowdin CLI, you should first generate your configuration file and then run the tool. By default, Crowdin CLI looks for a configuration file named *crowdin.yaml* or *crowdin.yml* (so you don’t have to specify the file name unless it’s different from *crowdin.yaml*).

To create the configuration file run the following command:

```console
crowdin init
```

When calling Crowdin CLI in terminal make sure you are in your project root directory. Otherwise, you need to specify a configuration file path using  `--config` option:

```console
crowdin upload sources --config /path/to/your/config/file
```

Sample configuration file:

```yaml
"project_id": "12"
"api_token": "54e01--your-personal-token--2724a"
"base_path": "."
"base_url": "https://api.crowdin.com" # https://{organization-name}.crowdin.com

"preserve_hierarchy": true

"files": [
  {
    "source" : "/t1/**/*",
    "translation" : "/%two_letters_code%/%original_file_name%"
  }
]
```

For more information how to configure Crowdin CLI, check <a href="https://support.crowdin.com/configuration-file/" target="_blank">Configuration File</a> article.

## Usage

Once the configuration file is created, you can use Crowdin CLI to manage your localization resources and automate file synchronization.

### General Commands

To display help information:

```console
crowdin -h
```

```console
crowdin <command> -h
```

To generate skeleton configuration file:

```console
crowdin init
```

To check configuration file for general mistakes:

```console
crowdin lint
```

To display a list of files uploaded to Crowdin:

```console
crowdin list project
```

### Uploading Resources

To upload source files to Crowdin:

```console
crowdin upload sources
```

To upload single file without a configuration:

```console
crowdin upload sources \
    -s path/to/your/file \
    -t file/export/pattern \
    -T personal-access-token \
    -i project-id \
    --base-url https://api.crowdin.com
```

Use <a href="https://support.crowdin.com/configuration-file/#placeholders" target="_blank">placeholders</a> to put appropriate variables.

To display a list of files that will be uploaded to Crowdin:

```console
crowdin upload sources --dryrun
```

To upload existing translations to Crowdin (translations will be synchronized):

```console
crowdin upload translations
```

To show detailed information about the `upload` command:

```console
crowdin upload --help
```

## Downloading Translations

To download the latest translations from Crowdin:

```console
crowdin download
```

To download the latest translations for the specific language (<a href="https://support.crowdin.com/api/language-codes/" target="_blank">language codes</a>):

```console
crowdin download -l {language_code}
```

To display a list of the latest translations from Crowdin:

```console
crowdin download --dryrun
```

To show detailed information about the `download` command:

```console
crowdin download --help
```

## Versions Management

There is no need to run specific command to create version branches if you use synchronization tool. The version branch is created automatically during the files upload.

To upload source files to the specified version branch:

```console
crowdin upload sources -b {branch_name}
```

To upload translations to the specified version branch:

```console
crowdin upload translations -b {branch_name}
```

To download translations from the specified version branch:

```console
crowdin download -b {branch_name}
```

## Source strings management

There is a possibility to manage (add, edit, delete) source strings for the following file types: CSV, RESX, JSON, Android XML, MACOSX, STRINGS, PROPERTIES.

|Command                   | Description                     |
|--------------------------|---------------------------------|
| `crowdin string list`    | Show a list of source strings in the current project. <br>You can use the `--verbose` option to see more information |
| `crowdin string add`     | Create a new source string. <br>Use `-h` option to see all possible command options |
| `crowdin string delete`  | Delete source string |
| `crowdin string edit`    | Edit existing source string |

## Translation and proofreading progress

To show translation and proofreading progress for a project use the following commands:

|Command                         | Description                     |
|--------------------------------|---------------------------------|
| `crowdin status`               | Show translation and proofreading progress for a project |
| `crowdin status translation`   | Show only translation progress for a project |
| `crowdin status proofreading`  | Show only proofreading progress for a project |

Also, you can use the `--verbose` option to see more information.

## Glossary management

There is a possibility to upload/download glossaries.

| Command                     | Description                        |
|-----------------------------|------------------------------------|
| `crowdin glossary list`     | Show a list of glossaries. <br>Use —verbose to show term lists for glossaries |
| `crowdin glossary upload`   | Upload glossary from a file (in TBX, CSV, or XLSX file format) <br>either to the specified glossary or to a new one |
| `crowdin glossary download` | Download glossary file (in TBX, CSV, or XLSX file format) <br>from the specified glossary |

## Translation memory management

To manage translation memories use the following commands:

| Command                 | Description                            |
|-------------------------|----------------------------------------|
| `crowdin tm list`       | Show a list of translation memories    |
| `crowdin tm upload`     | Upload translation memory from a file <br/>(Supported file formats: TMX, CSV, XLS/XLSX)  |
| `crowdin tm download`   | Download translation memory to a file  |

## Seeking Assistance

If you find any problems or would like to suggest a feature, please read the [How can I contribute](/CONTRIBUTING.md#how-can-i-contribute) section in our contributing guidelines.

Need help working with Crowdin CLI or have any questions? [Contact](https://crowdin.com/contacts) Customer Success Service.

## Contributing

If you want to contribute please read the [Contributing](/CONTRIBUTING.md) guidelines.

## Authors

* Ihor Popyk (ihor.popyk@crowdin.com)
* Yaroslav Medentsii (medentsiy.y@gmail.com)
* Daniil Barabash (dbarabash42@gmail.com)

## License
<pre>
The Crowdin CLI is licensed under the MIT License. 
See the LICENSE.md file distributed with this work for additional 
information regarding copyright ownership.

Except as contained in the LICENSE file, the name(s) of the above copyright
holders shall not be used in advertising or otherwise to promote the sale,
use or other dealings in this Software without prior written authorization.
</pre>
