## Notes

When passing CroQL queries or any argument that includes double quotes ("), correct escaping is required depending on the shell you are using.

If you do not use an [argument file](https://crowdin.github.io/crowdin-cli/advanced#argument-file), here is how to manually format your command:

- Bash (Linux, macOS, Git Bash)
Use single quotes ' around the entire query:

```bash
crowdin string list --croql 'identifier CONTAINS "label"'
```

- PowerShell
Escape each double quote " by using escaped backticks `:

```powershell
crowdin string list --croql "identifier CONTAINS \`"label\`""
```

- cmd.exe (Command Prompt)
Escape double quotes by doubling them "":

```cmd
crowdin string list --croql "identifier CONTAINS ""label"""
```

## See also

- [Crowdin Query Language (CroQL)](https://developer.crowdin.com/croql/)
