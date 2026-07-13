## Examples

Add a new distribution for a single bundle:

```bash
crowdin distribution add "Android" --bundle-id 19
```

Add a new distribution spanning multiple bundles:

```bash
crowdin distribution add "iOS Bundle" --bundle-id 19 --bundle-id 20
```

See the [`crowdin bundle list` command](crowdin-bundle-list) to get the list of bundles including their IDs.
