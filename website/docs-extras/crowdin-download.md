## Notes

- `-l`, `--language=language_code` - defines the language translations that should be downloaded from Crowdin. By default, translations are downloaded for all project's target languages. [Crowdin Language Codes](https://developer.crowdin.com/language-codes/).

## Examples

Download multiple languages:

```bash
crowdin download -l de -l fr -l it
crowdin download --language=de --language=fr --language=it
```

Download all translations even if the corresponding source files are missing locally:

```bash
crowdin download --all
```
