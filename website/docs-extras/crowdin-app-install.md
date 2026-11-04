## Examples

Install an application from Crowdin Store:

```bash
crowdin app install batch-add-strings
```

Install a private application, or one not listed in Crowdin Store, from its manifest URL:

```bash
crowdin app install --manifest-url https://my-app.example.com/manifest.json
```

## Notes

Pass either an application identifier or `--manifest-url`, not both. The manifest URL must use https.
