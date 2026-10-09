## Upsert behavior

The command is an upsert, not a plain add. The screenshot's identity is the **basename of the local file** (`ui/login.png` and `mobile/login.png` are both `login.png`), so re-running the command with the same file name replaces the existing screenshot's image in place, keeping its id, its position in the project and — unless `--auto-tag` is passed — its tags. That is what makes scripted uploads idempotent.

If several screenshots share the same name, the oldest one is updated and a warning is printed.

## Directory upload

Pass a directory instead of a file to upload every `jpeg`, `jpg`, `png` and `gif` image under it, including subdirectories. Other files, and hidden files and directories, are skipped. Each image goes through the same upsert as a single file, and all options apply to every image.

```bash
crowdin screenshot upload screenshots/ --label release-2.0
```

Because the name is the identity, images under one directory must have unique file names: if `ui/login.png` and `mobile/login.png` are both found, nothing is uploaded and the command fails listing them.

A failed image doesn't stop the others; the command reports each failure and exits with an error at the end. With `--output json` or `toon`, the uploaded screenshots are printed as one list once all uploads finish.

Images are uploaded in parallel, except with `--auto-tag`: auto-tagging locks the whole project while it runs, so they are uploaded one at a time.

## Tags

Without `--auto-tag`, existing tags are preserved when the image is replaced.

With `--auto-tag`, all existing tags of the screenshot are removed and re-derived by OCR. Manually placed or coordinate-accurate tags are lost. If auto-tagging is already running for the project, the image is still updated and a warning is printed instead of the tags being applied.

## Labels

`--label` sets the screenshot's labels on both create and update, replacing any labels the existing screenshot had. Labels that don't exist yet are created.
