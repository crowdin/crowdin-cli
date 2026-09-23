## Examples

List the target languages of the project:

```bash
crowdin language list
```

Show the text direction and plural categories of each language:

```bash
crowdin language list --verbose
```

```
◆  ar Arabic
	- direction: rtl
	- plurals: zero, one, two, few, many, other
◆  uk Ukrainian
	- direction: ltr
	- plurals: one, few, many, other
```

List all the languages Crowdin supports, with their locale codes:

```bash
crowdin language list --all --code locale
```
