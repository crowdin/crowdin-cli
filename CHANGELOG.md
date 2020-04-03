# Changelog
All notable changes to this project will be documented in this file.

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
