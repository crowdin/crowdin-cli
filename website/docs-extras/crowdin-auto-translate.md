## Examples

```bash
crowdin auto-translate -l fr -l uk --method tm --file src/values/strings.xml
crowdin auto-translate -l fr --method mt --engine-id 5 --file src/values/strings.xml
crowdin auto-translate -l fr --method mt --engine-id 5 --branch main --file src/values/strings.xml
```

Start the auto-translation without waiting for it, then check on it later (e.g. in a later CI step):

```bash
id=$(crowdin auto-translate -l fr --method ai --ai-prompt 7 --async --output plain)
crowdin auto-translate status "$id" --wait
```
