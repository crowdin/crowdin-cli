## Notes

- This command relies on the source files and folder structure in Crowdin and will download them to the same structure locally. If you're using the `preserve_hierarchy` option as `false`, it may skip directories when uploading sources to Crowdin and as a result the downloaded sources may be placed in a different location than the original ones. It's highly recommended to use `"preserve_hierarchy": true` if you want to use this command.
