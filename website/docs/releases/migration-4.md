# Migration guide from 3.x to 4.x

This guide is intended to help you migrate from CLI 3.x to 4.x. It is not a comprehensive guide, but rather a list of the most important changes.

### Glossary updates

* removed `name` prop from upload and download commands
* moved `id` to arguments (only for download commands)
* updated `list` cmd output

Before:

- `crowdin glossary download --id <id>` or `crowdin glossary download --name <name>`
- `crowdin glossary upload --id <id>` or `crowdin glossary upload --name <name>`

After:

(Use `list` command to get id)

- `crowdin glossary download <id>`
- `crowdin glossary upload --id <id>`

### TM updates

* removed `name` prop from upload and download commands
* moved `id` to arguments (only for download commands)
* updated `list` cmd output

Before:

- `crowdin tm download --id <id>` or `crowdin tm download --name <name>`
- `crowdin tm upload --id <id>` or `crowdin tm upload --name <name>`

After:

(Use `list` command to get id)

- `crowdin tm download <id>`
- `crowdin tm upload --id <id>`

### Screenshots updates

* updated `list` cmd output
* replaced `name` parameter with `id` to `delete` cmd

Before:

- `crowdin screenshot delete <name>`

After:

(Use `list` command to get id)

- `crowdin screenshot delete <id>`

### Branch updates

* removed `crowdin list branches` command
* create new command `crowdin branch list` command
* updated `list`, `add` cmd output

Before:

- `crowdin list branches`

After:

- `crowdin branch list`

### Language updates

* removed `crowdin list languages` command
* create new command `crowdin language list` command
* updated `list` cmd output
* added new param `--all` to get all languages for current account
* changed default `code` for list command. Now it's `id` instead of `two_letters_code`

Before:

- `crowdin list languages`

After:

- `crowdin language list`
- 
### File updates

* removed `crowdin list project` command
* create new command `crowdin file list` command
* updated `list` cmd output
* added verbose (`--verbose`) output
* to download translations for all project languages `-l all` can be used

Before:

- `crowdin list project`

After:

- `crowdin file list`

### Init command

* `generate` alias was removed

Before:

- `crowdin init` or `crowdin generate`

After:

- `crowdin init`

### String updates

* in `add` command added `branch` param support instead of branch in file path
* `edit` command rework
  * moved `id` to parameter
  * now `identifier` is used as an option to edit and not to find needed string
  * output updates
* `delete` command rework
  * moved `id` to parameter. Now only 1 string can be removed at time
  * removed `text` and `identifier` options. Only `id` is used as a string identifier
  * output updates
* in `list` command added `--directory` and `--scope` options. Output updates

Before:

- `crowdin string add Download --file main/src/values/strings.xml --identifier "app.download"`
- `crowdin string edit --id 12 --text new`
- `crowdin string delete --id 12`

After:

- `crowdin string add Download --file src/values/strings.xml --identifier "app.download" --branch main`
- `crowdin string edit 12 --text new`
- `crowdin string delete 12`

### Download targets

* removed `crowdin download targets` command
* removed `targets` from configuration file

### Pre-translate

* added `file` parameter (required for file-based projects)
* now `file` value(s) determines which files to pre-translate

### Task updates

* updated `add` cmd output
* removed backward compatibility for file ids in task add command

### Crowdin List => Crowdin Config

* renamed `crowdin list` to `crowdin config`

Before:

- `crowdin list sources`
- `crowdin list translations`
-
After:

- `crowdin config sources`
- `crowdin config translations`

### Lint

* command was moved under `config` namespace

Before:

- `crowdin lint`

After:

- `crowdin config lint`

### Bundle

* updated `list`, `add` cmd output

### Comment

* updated `list` cmd output

### Distribution

* updated `add` cmd output

### Label

* updated `add` cmd output