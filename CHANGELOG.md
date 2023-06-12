# Changelog

# [3.13.0](https://github.com/crowdin/crowdin-cli/compare/3.12.0...3.13.0) (2023-06-12)


### Bug Fixes

* .env load - pass the cause exception for later retrieval ([#591](https://github.com/crowdin/crowdin-cli/issues/591)) ([fd0033d](https://github.com/crowdin/crowdin-cli/commit/fd0033d547981bf1b7866c964589b2e4e84ccb7b))
* plain view for --keep-archive option ([#590](https://github.com/crowdin/crowdin-cli/issues/590)) ([7d33cb6](https://github.com/crowdin/crowdin-cli/commit/7d33cb65495fe6861ffce030f9ed31afd4c10bd8))


### Features

* Option to exclude some languages from the build ([#595](https://github.com/crowdin/crowdin-cli/issues/595)) ([325a014](https://github.com/crowdin/crowdin-cli/commit/325a01468783ab089a302b2ee22dc5d3f2285a29))

# [3.12.0](https://github.com/crowdin/crowdin-cli/compare/3.11.1...3.12.0) (2023-05-30)


### Bug Fixes

* **config:** discrepancies and indentation ([#584](https://github.com/crowdin/crowdin-cli/issues/584)) ([728dc9c](https://github.com/crowdin/crowdin-cli/commit/728dc9c2477647f8671a3b8ca51a01b0b7b9cb7e))


### Features

* improve CLI messages ([#582](https://github.com/crowdin/crowdin-cli/issues/582)) ([99595eb](https://github.com/crowdin/crowdin-cli/commit/99595eb2ed69bb7297c65fb38b26357f37e60196))
* New command: comment ([#588](https://github.com/crowdin/crowdin-cli/issues/588)) ([3aefca0](https://github.com/crowdin/crowdin-cli/commit/3aefca085382c6a16fd35a559b81471af5fea203))

## [3.11.1](https://github.com/crowdin/crowdin-cli/compare/3.11.0...3.11.1) (2023-05-16)


### Bug Fixes

* download multiple sources with the same destination ([#574](https://github.com/crowdin/crowdin-cli/issues/574)) ([6f68e2a](https://github.com/crowdin/crowdin-cli/commit/6f68e2ad8b24f385db20ba7d0175576751bc6f15))
* support double curly braces ([#572](https://github.com/crowdin/crowdin-cli/issues/572)) ([e3c20eb](https://github.com/crowdin/crowdin-cli/commit/e3c20eb27e7c33cf11c2a2c2821483c0a5acc9d3))

# [3.11.0](https://github.com/crowdin/crowdin-cli/compare/3.10.1...3.11.0) (2023-04-24)


### Bug Fixes

* download sources with double asterisk ([#538](https://github.com/crowdin/crowdin-cli/issues/538)) ([88ae567](https://github.com/crowdin/crowdin-cli/commit/88ae5673ad6589abca849fcfa0559f242c532cc8))
* handle upgrade subscription message ([#548](https://github.com/crowdin/crowdin-cli/issues/548)) ([59d0a84](https://github.com/crowdin/crowdin-cli/commit/59d0a841efa6d5447330e4f4b40efee308656238))
* ignore option with double asterisk ([#568](https://github.com/crowdin/crowdin-cli/issues/568)) ([276d106](https://github.com/crowdin/crowdin-cli/commit/276d10677cfb10f84602f740d569a3217ddd12f0))
* incorrect translation pattern on upload (windows) ([#544](https://github.com/crowdin/crowdin-cli/issues/544)) ([136ae16](https://github.com/crowdin/crowdin-cli/commit/136ae163f9f2a7e79e32d3e87af9b9b374c7123e))


### Features

* add bundle command support into cli ([#549](https://github.com/crowdin/crowdin-cli/issues/549)) ([d0f0be3](https://github.com/crowdin/crowdin-cli/commit/d0f0be3fbc22f6c658eee0ab97dbaea26390e4a5))
* add more file formats support for the 'targets' command ([#545](https://github.com/crowdin/crowdin-cli/issues/545)) ([6b2f6d5](https://github.com/crowdin/crowdin-cli/commit/6b2f6d5232090f84216a1c59a786dc6f65453e99))
* no preserve hierarchy for upload ([#541](https://github.com/crowdin/crowdin-cli/issues/541)) ([4a849a3](https://github.com/crowdin/crowdin-cli/commit/4a849a36c3e1b9dcb60db14bbb03a2e9e2978d01))

## [3.10.1]

### Fixed

- fix delete obsolete option ([#536](https://github.com/crowdin/crowdin-cli/pull/536))
- fix config file checker ([#532](https://github.com/crowdin/crowdin-cli/pull/532))
- fix download sources command ([#537](https://github.com/crowdin/crowdin-cli/pull/537))
- ignore content segmentation option when it's null ([#539](https://github.com/crowdin/crowdin-cli/pull/539))

## [3.10.0]

### Added

- feat: implement tasks management ([#522](https://github.com/crowdin/crowdin-cli/pull/522))

### Updated

- perf: load all project info per branch ([#515](https://github.com/crowdin/crowdin-cli/pull/515))
- ci: more automated publishing process ([#530](https://github.com/crowdin/crowdin-cli/pull/530))

## [3.9.3]

### Fixed

- Fix node-fetch issue (2) ([#527](https://github.com/crowdin/crowdin-cli/pull/527))

## [3.9.2]

### Added

- Add the `--keep-archive` option for the download translations command ([#520](https://github.com/crowdin/crowdin-cli/pull/520))
- Helper script for Windows shell environments ([#521](https://github.com/crowdin/crowdin-cli/pull/521))

### Updated

- More tests for better coverage ([#509](https://github.com/crowdin/crowdin-cli/pull/509))
- Minor cleanup ([#511](https://github.com/crowdin/crowdin-cli/pull/511))
- Use GH Actions instead of Azure Pipelines and prepare CI to run Unit tests on Windows ([#512](https://github.com/crowdin/crowdin-cli/pull/512))
- Ignore version check for -h,-v and crowdin command w/o args ([#516](https://github.com/crowdin/crowdin-cli/pull/516))
- Handle empty files upload ([#517](https://github.com/crowdin/crowdin-cli/pull/517))

### Fixed

- Fix node-fetch issue ([#524](https://github.com/crowdin/crowdin-cli/pull/524))

## [3.9.1]

### Updated

- Corrects misspellings ([#499](https://github.com/crowdin/crowdin-cli/pull/499))
- Updating test coverage ([#500](https://github.com/crowdin/crowdin-cli/pull/500))
- Increase test coverage ([#503](https://github.com/crowdin/crowdin-cli/pull/503))

### Fixed

- Fix organization domain extracting from base_url ([#498](https://github.com/crowdin/crowdin-cli/pull/498))

## [3.9.0]

### Added

- Add downloading multiple specified languages ([#493](https://github.com/crowdin/crowdin-cli/pull/493))
- Add '--dryrun' mode to the 'download sources' command ([#485](https://github.com/crowdin/crowdin-cli/pull/485))
- Add the `export_string_that_passed_workflow` export option support ([#487](https://github.com/crowdin/crowdin-cli/pull/487))
- Add Unit tests for `StatusAction.java` ([#494](https://github.com/crowdin/crowdin-cli/pull/494))

### Updated

- Improve async progress status checking for some commands ([#478](https://github.com/crowdin/crowdin-cli/pull/478))
- Make lint throw error with no config file ([#483](https://github.com/crowdin/crowdin-cli/pull/483))

### Fixed

- Fixed regex to work correctly for Windows machines ([#484](https://github.com/crowdin/crowdin-cli/pull/484))

## [3.8.1]

### Fixed

- Fix infinite build progress check in case of the build was failed ([#476](https://github.com/crowdin/crowdin-cli/pull/476))

## [3.8.0]

### Added

- Download reviewed sources command ([#471](https://github.com/crowdin/crowdin-cli/pull/471))
- `--fail-if-incomplete` option for status commands ([#466](https://github.com/crowdin/crowdin-cli/pull/466))
- `branch` parameter support for Pseudo-Localization download ([#472](https://github.com/crowdin/crowdin-cli/pull/472))

## [3.7.10]

### Added

- `import_translations` option support for spreadsheet files ([#463](https://github.com/crowdin/crowdin-cli/pull/463))

### Updated

- Improved error handling for the `pre-translate` command ([#461](https://github.com/crowdin/crowdin-cli/pull/461))

## [3.7.9]

### Updated

- Support language ID in list languages command ([#454](https://github.com/crowdin/crowdin-cli/pull/454))
- Update jDeploy ([#437](https://github.com/crowdin/crowdin-cli/pull/437))
- Dependencies update ([#442](https://github.com/crowdin/crowdin-cli/pull/442))

## [3.7.8]

### Updated

- Update jDeploy to 2.0.11 ([#426](https://github.com/crowdin/crowdin-cli/pull/426))
- Bump shelljs from 0.8.4 to 0.8.5 ([#424](https://github.com/crowdin/crowdin-cli/pull/424))

### Fixed

- Fix relative base paths ('.', '..') ([#432](https://github.com/crowdin/crowdin-cli/pull/432))
- Fix 'download sources' command on Windows ([#433](https://github.com/crowdin/crowdin-cli/pull/433))

## [3.7.7]

### Updated

- Update log4j to 2.17.1 ([#421](https://github.com/crowdin/crowdin-cli/pull/421))

### Fixed

- Fix installation and uninstall scripts ([#422](https://github.com/crowdin/crowdin-cli/pull/422))

## [3.7.6]

### Updated

- Update TM and Glossary uploads: '--language' is required for creating new instances ([#419](https://github.com/crowdin/crowdin-cli/pull/419))

## [3.7.5]

### Updated

- Update gradle to 7.3.1 ([#414](https://github.com/crowdin/crowdin-cli/pull/414))

### Fixed

- Fix regex building from path on Windows ([#417](https://github.com/crowdin/crowdin-cli/pull/417))

## [3.7.4]

### Updated

- Update log4j to 2.16.0 ([#413](https://github.com/crowdin/crowdin-cli/pull/413))

## [3.7.3]

### Updated

- Update log4j to 2.15.0 ([#410](https://github.com/crowdin/crowdin-cli/pull/410))

### Fixed

- Fix 'streamIsEmpty' error ([#409](https://github.com/crowdin/crowdin-cli/pull/409))

## [3.7.2]

### Updated

- Add check if an archive is empty and add a message when there are no files to the 'download' command ([#406](https://github.com/crowdin/crowdin-cli/pull/406))
- Improve timing for checking building translations ([#406](https://github.com/crowdin/crowdin-cli/pull/406))

### Fixed

- Fix '%original_path%' placeholder for downloading ([#406](https://github.com/crowdin/crowdin-cli/pull/406))

## [3.7.1]

### Added
- Add 'croql' parameter to 'string list' ([#401](https://github.com/crowdin/crowdin-cli/pull/401))

### Fixed

- Fix selecting source files with 'dest' param for 'download sources', 'dryrun translations' and 'download' commands ([#399](https://github.com/crowdin/crowdin-cli/pull/399))
- Little fix for 'generate' command ([#400](https://github.com/crowdin/crowdin-cli/pull/400))

## [3.7.0]

### Added

- Add new 'branch' subcommands ([#393](https://github.com/crowdin/crowdin-cli/pull/393))
- Add 'custom_segmentation' field support in config ([#389](https://github.com/crowdin/crowdin-cli/pull/389))
- Add '--branch' param for 'string list' command ([#389](https://github.com/crowdin/crowdin-cli/pull/389))

### Updated

- Improve '--delete-obsolete' logic ([#394](https://github.com/crowdin/crowdin-cli/pull/394))
- Remove requirement for 'files' block for some commands ([#393](https://github.com/crowdin/crowdin-cli/pull/393))

### Fixed

- Fix showing New version banner with '--plain' param ([#389](https://github.com/crowdin/crowdin-cli/pull/389))
- Fix message in authorizing via browser ([#389](https://github.com/crowdin/crowdin-cli/pull/389))
- Fix 'dest' ([#396](https://github.com/crowdin/crowdin-cli/pull/396))
- Fix exception handling at uploading file to storage in 'upload source' action ([#389](https://github.com/crowdin/crowdin-cli/pull/389))

## [3.6.5]

### Added

- Add '--branch' option for 'status' commands ([#374](https://github.com/crowdin/crowdin-cli/pull/374))
- Add '--delete-obsolete' option to 'upload sources' command ([#374](https://github.com/crowdin/crowdin-cli/pull/374))
- Add '--label' option to 'string add' and 'string edit' commands ([#384](https://github.com/crowdin/crowdin-cli/pull/384))

### Fixed

- Fix uploading XLSX files ([#377](https://github.com/crowdin/crowdin-cli/pull/377))
- Fix not showing all omitted files and improve building export patterns ([#378](https://github.com/crowdin/crowdin-cli/pull/378))

## [3.6.4]

### Updated

- Update Crowdin API client to 1.3.10 ([#380](https://github.com/crowdin/crowdin-cli/pull/380))

## [3.6.3]

### Updated

- Update subdependencies and code for Gradle 7.1 ([#371](https://github.com/crowdin/crowdin-cli/pull/371))
- Update Crowdin API client to 1.3.9 ([#375](https://github.com/crowdin/crowdin-cli/pull/375))

## [3.6.2]

### Added

- Add lazy initialization for dotenv code and error handling for duplicate environment variables ([#363](https://github.com/crowdin/crowdin-cli/pull/363))

### Updated

- Improve 'dest' parameter - add new placeholders ([#363](https://github.com/crowdin/crowdin-cli/pull/363))

## [3.6.1]

### Updated

- 'crowdin download' command improvements ([#358](https://github.com/crowdin/crowdin-cli/pull/358))
- AUR package: remove gradle dependency usage ([#359](https://github.com/crowdin/crowdin-cli/pull/359))

## [3.6.0]

### Added

- 'crowdin pre-translate' command ([#354](https://github.com/crowdin/crowdin-cli/pull/354))
- 'crowdin list languages' command ([#354](https://github.com/crowdin/crowdin-cli/pull/354))
- '--dest' parameter support as a command config option ([#354](https://github.com/crowdin/crowdin-cli/pull/354))

### Fixed

- Fix error type selection for invalid CSV scheme ([#354](https://github.com/crowdin/crowdin-cli/pull/354))

## [3.5.5]

### Fixed

- Fix for searching files with a plus symbol in a name ([#350](https://github.com/crowdin/crowdin-cli/pull/350))

## [3.5.4]

### Added

- Add '--[no-]translate-hidden' parameter to 'upload translations' command ([#344](https://github.com/crowdin/crowdin-cli/pull/344))
- Add '%file_name%' placeholder for 'dest' parameter ([#344](https://github.com/crowdin/crowdin-cli/pull/344))
- Add support for downloading file groups with 'dest' parameter ([#344](https://github.com/crowdin/crowdin-cli/pull/344))
- Add 'branch exists' message to 'upload' command ([#344](https://github.com/crowdin/crowdin-cli/pull/344))

### Updated

- Upload file as spreadsheet if 'dest' parameter has .csv extension ([#344](https://github.com/crowdin/crowdin-cli/pull/344))

### Fixed

- Fix config file missing message ([#344](https://github.com/crowdin/crowdin-cli/pull/344))
- Fix upload sources for Windows ([#344](https://github.com/crowdin/crowdin-cli/pull/344))

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
