## Upsert behavior

The command is an upsert, not a plain add. The screenshot's identity is the **basename of the local file** (`ui/login.png` and `mobile/login.png` are both `login.png`), so re-running the command with the same file name replaces the existing screenshot's image in place, keeping its id, its position in the project and — unless `--auto-tag` is passed — its tags. That is what makes scripted uploads idempotent.

If several screenshots share the same name, the oldest one is updated and a warning is printed.

## Tags

Without `--auto-tag`, existing tags are preserved when the image is replaced.

With `--auto-tag`, all existing tags of the screenshot are removed and re-derived by OCR. Manually placed or coordinate-accurate tags are lost. If auto-tagging is already running for the project, the image is still updated and a warning is printed instead of the tags being applied.

## Labels

`--label` sets the screenshot's labels on both create and update, replacing any labels the existing screenshot had. Labels that don't exist yet are created.
