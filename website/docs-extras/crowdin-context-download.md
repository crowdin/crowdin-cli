## JSONL

The command exports the project's strings to a local `.jsonl` file, ready for AI enrichment. JSONL is a line-delimited format that is easy to parse and write. It is a good format for AI agents to work with.

The JSON objects in the file include the following fields:

- `id`: String ID in Crowdin
- `key`: String key
- `text`: Source text
- `file`: Crowdin file path
- `context`: Existing source context
- `ai_context`: AI context to set

## Notes

The `--croql` option cannot be used together with other filter options.
