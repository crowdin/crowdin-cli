## Notes

To form the scheme for your CSV or XLS/XLSX glossary file, use the following constants:

- `term_{language_code}` – Column contains terms.
- `{column_number}` – Column number.Numbering starts from 0.
- `description_{language_code}` – Column contains term descriptions.
- `partOfSpeech_{language_code}` – Column contains part of speech for terms.

Where `{language_code}` – Language code for the specified language.See the full list of [Supported Languages](https://developer.crowdin.com/language-codes).

`--first-line-contains-header` – used to skip the import of the first row (header).
