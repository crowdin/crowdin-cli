## Examples

Add a new string with the `app.home` key to the `src/values/strings.xml` file:

```bash
crowdin string add Home --file src/values/strings.xml --identifier "app.home"
```

Add a new string with the `app.download` key to the `src/values/strings.xml` file (branch `main`):

```bash
crowdin string add Download --file src/values/strings.xml --identifier "app.download" --branch main
```

Add a new string with the `app.hello` key to the `strings.xml` file, with labels `app` and `home`:

```bash
crowdin string add "Hello world" --file strings.xml --identifier "app.hello" --label app --label home
```

Add a new plural string:

```bash
crowdin string add Cats --file strings.xml --identifier "ui.cats" --one "cat"
```

In this example, the `<text>` argument is used as the "other" plural form.

If your source language contains more plural forms, you can also specify them using the `--two`, `--few`, `--many` and `--zero` options.
