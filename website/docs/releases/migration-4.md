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

Replaced `name` parameter with `id` to delete screenshot

Before:

- `crowdin screenshot delete <name>`

After:

(Use `list` command to get id)

- `crowdin screenshot delete <id>`

### Branch updates

* removed `crowdin list branches` command
* create new command `crowdin branch list` command
* updated `list` cmd output

Before:

- `crowdin list branches`

After:

- `crowdin branch list`

### Language updates

* removed `crowdin list languages` command
* create new command `crowdin language list` command
* updated `list` cmd output
* added new param `--all` to get all languages for current account

Before:

- `crowdin list languages`

After:

- `crowdin language list`
