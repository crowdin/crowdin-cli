# Changelog
All notable changes to this project will be documented in this file.

## [3.5.3]

### Added

- Add '--all' option to download translations without local sources ([#338](https://github.com/crowdin/crowdin-cli/pull/338))
- Add '--branch' option for 'download targets' ([#338](https://github.com/crowdin/crowdin-cli/pull/338))

### Updated

- Refactor error handlers and add error handler for 'upload translations' ([#338](https://github.com/crowdin/crowdin-cli/pull/338))
- Upgrade picocli version ([#338](https://github.com/crowdin/crowdin-cli/pull/338))

### Fixed

- Fix Language Mapping for 'download targets' ([#338](https://github.com/crowdin/crowdin-cli/pull/338))
- Fix verbose message for 'glossary list' ([#338](https://github.com/crowdin/crowdin-cli/pull/338))
- Fix 'list translations' - add accounting for excluded languages ([#338](https://github.com/crowdin/crowdin-cli/pull/338))

## [3.5.2]

### Added

- `.env` support ([#337](https://github.com/crowdin/crowdin-cli/pull/337))

## [3.5.1]

### Added

- Ability to exclude target languages for source files ([#331](https://github.com/crowdin/crowdin-cli/pull/331))
- Ability to ignore hidden files during sources upload ([#331](https://github.com/crowdin/crowdin-cli/pull/331))

### Fixed

- Fix 'glossary list --verbose' for non-managers ([#331](https://github.com/crowdin/crowdin-cli/pull/331))
- Fix 'download targets' for enterprise ([#331](https://github.com/crowdin/crowdin-cli/pull/331))
- Fix one message and add handler to 'add source' request ([#331](https://github.com/crowdin/crowdin-cli/pull/331))

## [3.5.0]

### Added

- `crowdin download sources` command ([#327](https://github.com/crowdin/crowdin-cli/pull/327))
- Labels support for `crowdin upload sources` command ([#327](https://github.com/crowdin/crowdin-cli/pull/327))
- Ability to configure export options for each file group ([#327](https://github.com/crowdin/crowdin-cli/pull/327))
- Using 'identifier' property in `crowdin string` commands ([#327](https://github.com/crowdin/crowdin-cli/pull/327))

### Updated

- Delete 'language_mapping' field from default configuration file ([#327](https://github.com/crowdin/crowdin-cli/pull/327))

### Fixed

- Fix messages for 'lint' command ([#327](https://github.com/crowdin/crowdin-cli/pull/327))

## [3.4.1] - 2020-11-16

### Updated

- Do not return exit code 1 if translation files are missing ([#325](https://github.com/crowdin/crowdin-cli/pull/325))

## [3.4.0] - 2020-11-09

### Added

- Ability to download translation from Crowdin to the specified target file (`crowdin download targets`) [Read more](https://github.com/crowdin/crowdin-cli/wiki/Download-translation-from-Crowdin-to-the-specified-target-file) ([#316](https://github.com/crowdin/crowdin-cli/pull/316))
- Pseudo-localization downloading (`crowdin download --pseudo`) [Read more](https://github.com/crowdin/crowdin-cli/wiki/Pseudo-localization-download) ([#316](https://github.com/crowdin/crowdin-cli/pull/316))

## [3.3.0] - 2020-09-28

### Added

- Glossary management. For more details - `crowdin glossary -h` ([#304](https://github.com/crowdin/crowdin-cli/pull/304))
- Translation memory management. For more details - `crowdin tm -h` ([#304](https://github.com/crowdin/crowdin-cli/pull/304))

### Updated

- Return non-zero code when errors presented in `upload` command ([#304](https://github.com/crowdin/crowdin-cli/pull/304/commits/2faae71c0102caa2c8bb6b64c2cc3f6ae405bb99))
- Update how CLI gets a list of project languages and in-context language ([#304](https://github.com/crowdin/crowdin-cli/pull/304/commits/8e3f8d0e6fbb1258ee942d5f81fa9eb4b8e0d86b))

### Fixed

- Fix Proxy ([#304](https://github.com/crowdin/crowdin-cli/pull/304))
- Fix `init` command to accept path formats on Windows ([#305](https://github.com/crowdin/crowdin-cli/pull/305))

## [3.2.2] - 2020-09-01

### Added
- Colors support ([#301](https://github.com/crowdin/crowdin-cli/pull/301))
- Add new 'crowdin list branches' command ([#300](https://github.com/crowdin/crowdin-cli/pull/300))
- Add checking for relative paths in translation patterns ([#296](https://github.com/crowdin/crowdin-cli/pull/296))
- Add autocomplete script to artifacts ([#298](https://github.com/crowdin/crowdin-cli/pull/298))

### Updated
- Improve 'crowdin init' ([#297](https://github.com/crowdin/crowdin-cli/pull/297))
- Improve searching for multilanguage csv translation files ([#299](https://github.com/crowdin/crowdin-cli/pull/299))
- Refactoring ([#301](https://github.com/crowdin/crowdin-cli/pull/301))

### Fixed
- Fix init command to accept path formats on Windows ([#305](https://github.com/crowdin/crowdin-cli/pull/305))

## [3.2.1] - 2020-07-24
- Added: Browser authorization for `init` command
- Added: Static analysis tools Spotbugs, Checkstyle
- Updated: Bump Gradle version
- Updated: Improve `--plain` mode for directories
- Updated: Improve new version message and change borders
- Fixed: Bug with in-Context language in the 'download' command for '-l' option
- Fixed: Bug with language placeholders for fileBeans with scheme

## [3.2.0] - 2020-07-08
- Added: Strings management functionality
- Added: Introduce a plain mode for usage in scripts
- Added: Install script: install an uninstaller
- Updated: Change help messages color scheme
- Updated: Warning emoji to one message and remove the suffix 'v3' from the doc link
- Fixed: Bug with intersecting sources
- Fixed: Translations upload with `dest` parameter
- Fixed: Fix bug with empty sources for `upload translations`

## [3.1.15] - 2020-06-04
- Updated: Update params for building translations request

## [3.1.14] - 2020-06-01
- Added: `status` command
- Added: Restrictions for 'upload translations' and 'download' commands
- Updated: Remove option and parameter for request `--import-duplicates`
- Updated: Installation scripts improvements
- Updated: Use Picocli version 4.3.2
- Updated: Better `project_id` validation
- Updated: Change approving for some options
- Fixed: Fix possible bug with a large project with many files/dirs
- Fixed: `ClassCastException` error

## [3.1.13] - 2020-05-19
- Added: `--skip-untranslated-strings` option for `download` command
- Added: `--skip-untranslated-files` option for `download` command
- Added: `--export-only-approved` option for `download` command
- Fixed: Output fixes

## [3.1.12] - 2020-05-12
- Added: `content_segmentation` option
- Added: Error emoji for exceptions in threads
- Updated: Use new Java API Client
- Updated: Separate logic and picocli ui
- Updated: A lot of refactoring and Unit tests
- Updated: Update picocli version
- Updated: Improve `--debug` (now it works for threads)
- Fixed: Fix for windows
- Fixed: Performance bug: remove ignore duplicates

## [3.1.11] - 2020-04-10
+ Updated: Improve tree output
+ Updated: Refactoring and tests
+ Fixed: Fix uploading problem for a big amount of files
+ Fixed: Help message for 'list'

## [3.1.10] - 2020-04-03
+ Added: Emoji for warnings/errors
+ Added: Handle 'Unauthorized' response
+ Added: Specific language support for `--dryrun`
+ Updated: Huge code refactoring and optimization
+ Updated: Change `--dryrun` output
+ Updated: Check branch existence before `--dryrun`
+ Fixed: Correct message about missing identity file
+ Fixed: Correct error messages about params

## [3.1.9] - 2020-03-19
+ Added: Support language mapping from server
+ Added: Set proxy properties from system environment
+ Updated: Return to old 'language_mapping' with crowdin codes
+ Fixed: Fix config options and write tests for PropertiesBeanBuilder
+ Fixed: Fix 'upload translations' for multilingual files

## [3.1.8] - 2020-03-16
+ Added: Newline for new version message
+ Added: Emojis to some messages
+ Updated: Set `escapeSpecialCharacters` by default to '1' for '*.properties' files
+ Updated: API - fix for 5xx responses
+ Updated: Set defaults for identity file
+ Fixed: Double asterisks with a slash at the start
+ Fixed: Return correct exit code

## [3.1.7] - 2020-03-11
+ Updated: Ignore directories using double-asterisk pattern
+ Updated: Update for --no-auto-update option of 'upload sources'
+ Fixed: CLI hanging trying to process non-existing directory
+ Fixed: Fix options for translations upload
+ Fixed: Fix for nonexistent path and little FileHelper refactoring
+ Fixed: `--identity` parameter processing
+ Fixed: Unexpected NPE while trying to download project

## [3.1.6] - 2020-03-09
+ Updated: texts update after review

## [3.1.5] - 2020-03-04
+ Updated: do not upload in-context language with 'upload translations'
+ Updated: allow base path to be relative to home directory

## [3.1.4] - 2020-03-04
+ Added: `escape_special_characters` option support for .properties file
+ Added: notification about new version
+ Updated: set default value for `escape_quotes` to 3
+ Updated: set default values for the configuration file to a list of `crowdin.yml` and `crowdin.yaml`
+ Updated: better error messages for base path

## [3.1.3] - 2020-02-27
+ Added: Bash/Zsh commands completion
+ Updated: set threads count to 4
+ Updated: improve files list output for `download` command
+ Updated: move descriptions and messages to resource bundle
+ Updated: help screens improvement

## [3.1.2] - 2020-02-19
+ Added: add message about wrong organization
+ Added: add User-Agent header
+ Updated: `escape_quotes` validation
+ Updated: make `--source` and `--translation` optional for params
+ Updated: params now can overwrite config
+ Updated: refactor gathering information about project and add message about wrong organization
+ Fixed: fix reuploading to branches
+ Fixed: fixes to config checking

## [3.1.1] - 2020-02-14
+ Added: add progress to show while building translations
+ Added: add `--dryrun` option to translations upload
+ Updated: improve `init` command
+ Fixed: fix branches - Now files can be in branches root

## [3.1.0] - 2020-02-11
+ Added: use picocli library for commands
+ Added: help messages color highlight
+ Added: 'base_url' validation and default value
+ Updated: texts on help screens
+ Fixed: high CPU usage on translation upload
+ Fixed: a lot of minor fixes and refactoring

## [3.0.7] - 2020-02-05
+ Updated: Change api use for settings

## [3.0.6] - 2020-01-27
+ Fix exportPattern with locale_with_underscore, android_code, osx_code
+ Don't pass escapeQuotes if it is not specified
+ Upload sources refactoring

## [3.0.5] - 2020-01-03
+ Updated: increase Pagination util limit
+ Updated: removed 'force' parameter for the 'Build Project Translation' api method
+ Fixed: in-Context support
+ Updated: refactoring: making Commands a little bit smaller
+ Fixed: directories API
+ Updated: refactored initialize-method
+ Updated: help-text for upload
+ Fixed: general help (drop redundant option, showing the correct message)
+ Updated: refactor run()
+ Fixed: fix escape_quotes
+ Updated: show relative path in messages in upload source
+ Updated: change createRevision to updateFile

## [3.0.4] - 2019-12-18
+ Fixed: language placeholders for ignore pattern
+ Updated: Unit-tests and CI/CD

## [3.0.3] - 2019-12-03
+ update config options (api_key -> api_token, project_identifier -> project_id)
+ fix: fixed list project command with specified branch
+ fix: fixed error message when project id is not specified
+ fix: added missing checkboxes

## [3.0.2] - 2019-11-26
+ Fixed: problem writing to a configuration file
+ Fixed: upload sources/translations on a root dir level 
+ Fixed: Fix language codes

## [3.0.1] - 2019-11-21
+ Increased performance in 6-7 times (multithreading)
+ Fixed: translations upload with `translation_replace` option
+ Fixed: sources upload with `preserve_hierarchy` option
+ Fixed: translations upload with `preserve_hierarchy` option
+ Fixed: CLI crash in the absence of source file on the Crowdin side
+ Fixed: Wrong files structure after upload for complex file trees
+ Fixed: Upload sources into branch

## [3.0.0] - 2019-08-16
+ API v2 Support
