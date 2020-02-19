**Unreleased**

**Version 3.1.2**

+ Added: add message about wrong organization
+ Added: add User-Agent header
+ Updated: `escape_quotes` validation
+ Updated: make `--source` and `--translation` optional for params
+ Updated: params now can overwrite config
+ Updated: refactor gathering information about project and add message about wrong organization
+ Fixed: fix reuploading to branches
+ Fixed: fixes to config checking

**Version 3.1.1**
+ Added: add progress to show while building translations
+ Added: add `--dryrun` option to translations upload
+ Updated: improve `init` command
+ Fixed: fix branches - Now files can be in branches root

**Version 3.1.0**
+ Added: use picocli library for commands
+ Added: help messages color highlight
+ Added: 'base_url' validation and default value
+ Updated: texts on help screens
+ Fixed: high CPU usage on translation upload
+ Fixed: a lot of minor fixes and refactoring

**Version 3.0.7**
+ Updated: Change api use for settings

**Version 3.0.6**
+ Fix exportPattern with locale_with_underscore, android_code, osx_code
+ Don't pass escapeQuotes if it is not specified
+ Upload sources refactoring

**Version 3.0.5**
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

**Version 3.0.4**
+ Fixed: language placeholders for ignore pattern
+ Updated: Unit-tests and CI/CD

**Version 3.0.3**
+ update config options (api_key -> api_token, project_identifier -> project_id)
+ fix: fixed list project command with specified branch
+ fix: fixed error message when project id is not specified
+ fix: added missing checkboxes

**Version 3.0.2**

+ Fixed: problem writing to a configuration file
+ Fixed: upload sources/translations on a root dir level 
+ Fixed: Fix language codes

**Version 3.0.1**

+ Increased performance in 6-7 times (multithreading)
+ Fixed: translations upload with `translation_replace` option
+ Fixed: sources upload with `preserve_hierarchy` option
+ Fixed: translations upload with `preserve_hierarchy` option
+ Fixed: CLI crash in the absence of source file on the Crowdin side
+ Fixed: Wrong files structure after upload for complex file trees
+ Fixed: Upload sources into branch

**Version 3.0.0**

+ API v2 Support

**Version 2.0.31**

+ Fixed: UnsupportedCharsetException

**Version 2.0.30**

+ Added: Return non zero exit code if error happened (fix [#77](https://github.com/crowdin/crowdin-cli-2/issues/77))

**Version 2.0.29**
+ Updated: Version of log4j (fix [#109](https://github.com/crowdin/crowdin-cli-2/issues/109))

**Version 2.0.28**
+ Updated: Version of log4j

**Version 2.0.27**
+ Updated: Version of jackson databind increased

**Version 2.0.26**
+ Bug fixed: replacement `**` in translation pattern

**Version 2.0.25**
+ Bug fixed: preserve_hierarchy option when target and source languages are the same
+ Fixed: escaping symbols in branch's name

**Version 2.0.24**
+ Added: support proxy via env variables HTTP_PROXY_HOST and HTTP_PROXY_PORT

**Version 2.0.23**
+ Added: allow symlinks as source files
+ Bug fixed: configuration loading from environment variables

**Version 2.0.22**
+ Bug fixed: translation downloading

**Version 2.0.21**
+ Updated: osx_code

**Version 2.0.20**
+ Added: escape round brackets

**Version 2.0.19**
+ Added: `**` in export pattern

**Version 2.0.18**
+ Added: osx_locale
+ Added: Cleaned `title`
+ Bugs fix

**Version 2.0.17**
+ General performance improvements (thanks to https://github.com/trejkaz)
+ Added: short aliases for commands (push, pull)

**Version 2.0.16**
+ Bugs fix
+ Added: spell checker for commands

**Version 2.0.15**
+ Improved: wildcard in export pattern
+ Improved: language mapping
+ Improved: update source file with dest option
+ Added: support of short option -c for set configuration file
+ General performance improvements

**Version 2.0.14**
+ Improved: `preserve_hierarchy` option
+ Added: downloading translations for each language separately

**Version 2.0.13**
+ Bug fixed: updating file with different extension in `source` and `dest` 

**Version 2.0.12**
+ Improved: export pattern 

**Version 2.0.11**
+ Improved: commands options 
+ Improved: `**` in export pattern 

**Version 2.0.10**
+ Improved: relative paths

**Version 2.0.9**
+ Improved: 'dest' option
+ Bug fixed: language mapping processing
+ Improved: export pattern on Windows OS

**Version 2.0.8**
+ Bug fixed: downloading translations on Windows OS

**Version 2.0.7**
+ Bug fixed: downloading translations from branch

**Version 2.0.6**
+ Bug fixed: adding directories or branches with same names
