#!/bin/sh

printf "[INFO] Prepare docs start...\n"

printf "\n[INFO] Gradle build...\n"

./gradlew build

printf "\n[INFO] Generating manpages...\n"

./gradlew generateManpageAsciiDoc

cd website/generated-picocli-docs || exit

printf "\n[INFO] Wrapping the Synopsis section with code block...\n"
sed -i.bak -e 's/Synopsis/Synopsis\n\n----/g' -- *.adoc
sed -i.bak -e 's/\/\/ end::picocli-generated-man-section-synopsis/----\n\n\/\/ end::picocli-generated-man-section-synopsis/g' -- *.adoc

printf "\n[INFO] Converting adoc -> md...\n"

cd ../mantemplates || exit

# Convert adoc to xml and then xml to md
asciidoctor -b docbook5 -d article -- *.adoc
find ./ -iname "*.xml" -type f -exec sh -c 'pandoc -f docbook -t markdown_strict "${0}" -o "../docs/commands/$(basename ${0%.xml}.md)"' {} \;

sed -i.bak -e 's/\x1B//g' -- *.xml # remove invisible ESC character from synopsis
rm -- *.xml
rm -- *.xml.bak

printf "\n[INFO] Prettifying content...\n"

cd ../docs/commands || exit

# Synopsis formatting
sed -i.bak -e 's/\[39m//g' -e 's/\[32m//g' -e 's/\[0m//g' -- *.md # remove style
sed -i.bak -e 's/\x1B//g' -- *.md # remove invisible ESC character
sed -i.bak -e 's/\xe2\x80\x8b//g' -- *.md # remove zero-width space
sed -i.bak -e 's/\\\[/\[/g' -e 's/\\\]/\]/g' -- *.md # remove brackets escape

# Content formatting
sed -i.bak -e 's/\*CONFIG OPTIONS\*\:/Config Options/g' -- *.md # CONFIG OPTIONS: -> Config Options
sed -i.bak -e 's/™/(TM)/g' -- *.md
sed -i.bak -e 's/crowdin.yml/`crowdin.yml`/g' -e 's/crowdin.yaml/`crowdin.yaml`/g' -- *.md
sed -i.bak -e 's/\*CONFIG OPTIONS\*\:/Config Options/g' -- *.md # CONFIG OPTIONS: -> Config Options
sed -i.bak -e 's/\*\*--\([[:alnum:]_\-]*\)\*\*/`--\1`/g' -- *.md # **--config** -> `--config`
sed -i.bak -e 's/\*\*-\([[:alnum:]_\-]*\)\*\*/`-\1`/g' -- *.md # **-c** -> `-c`
sed -i.bak -e 's/.xml)/)/g' -- *.md # fix links

sed -i.bak -e 's/# Description$/## Description/g; s/# Synopsis$/## Synopsis/g; s/# Commands$/## Commands/g; s/# Options$/## Options/g; s/# Arguments$/## Arguments/g' -- *.md

sed -i.bak -e 's/\*\*--\[no-\]hidden\*\*/`--\[no-]hidden`/g' -- *.md
sed -i.bak -e 's/\*\*--\[no-\]duplicate-translations\*\*/`--[no-]duplicate-translations`/g' -- *.md
sed -i.bak -e 's/\*\*--\[no-\]translate-untranslated-only\*\*/`--[no-]translate-untranslated-only`/g' -- *.md
sed -i.bak -e 's/\*\*--\[no-\]translate-with-perfect-match-only\*\*/--[no-]translate-with-perfect-match-only/g' -- *.md
sed -i.bak -e 's/\*\*--\[no-\]skip-assigned-strings\*\*/`--[no-]skip-assigned-strings`/g' -- *.md
sed -i.bak -e 's/\*\*--\[no-\]skip-untranslated-strings\*\*/`--[no-]skip-untranslated-strings`/g' -- *.md
sed -i.bak -e 's/\*\*--\[no-\]auto-update\*\*/`--[no-]auto-update`/g' -- *.md
sed -i.bak -e 's/\*\*--\[no-\]auto-approve-imported\*\*/`--[no-]auto-approve-imported`/g' -- *.md
sed -i.bak -e 's/\*\*--\[no-\]import-eq-suggestions\*\*/`--[no-]import-eq-suggestions`/g' -- *.md
sed -i.bak -e 's/\*\*--\[no-\]translate-hidden\*\*/`--[no-]translate-hidden`/g' -- *.md

rm -- *.md.bak

printf "\n[INFO] Content list:\n"
ls -l

printf "\n[INFO] Finish!" || exit
