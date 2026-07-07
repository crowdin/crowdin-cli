## Examples

Add a new distribution with the `default` export mode and the `src/values/strings.xml` file:

```bash
crowdin distribution add "Android" --export-mode default --file src/values/strings.xml
```

Add a new distribution with the `default` export mode and the `src/values/strings.xml` file on the `main` branch:

```bash
crowdin distribution add "Android" --export-mode default --branch main --file src/values/strings.xml
```

Add a new distribution with the `bundle` export mode:

```bash
crowdin distribution add "iOS Bundle" --export-mode bundle --bundle-id 19
```

See the [`crowdin bundle list` command](crowdin-bundle-list) to get the list of bundles including their IDs.
