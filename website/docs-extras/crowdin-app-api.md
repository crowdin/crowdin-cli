## Examples

Read the application settings of a project:

```bash
crowdin app api zendesk-guide settings -F projectId=12
```

Import selected items, sending an array with the `key[]=value` form:

```bash
crowdin app api zendesk-guide crowdin-update -X POST -F projectId=12 -f 'entryIds[]=cam_1' -f 'entryIds[]=cam_2'
```

Send a request body from a file:

```bash
crowdin app api zendesk-guide integration-update --input body.json
```

Cancel a job:

```bash
crowdin app api zendesk-guide jobs -X DELETE -F projectId=12 -F jobId=067d…
```

Print the request without sending it:

```bash
crowdin app api zendesk-guide 'job-info?projectId=12&jobId=067d…' --dryrun
```

## Notes

- The method defaults to `GET`, or `POST` when `--input` is given. Fields never change it, so pass `-X POST` to write.
- With `GET` and `DELETE`, fields are sent as query parameters. With `POST`, `PUT` and `PATCH`, they form the JSON body.
- `-f` sends the value as a string. `-F` converts `true`, `false`, `null` and integers, and reads `@file`.
- A key ending in `[]` collects its values into an array. Giving a plain key twice is an error.
- Put `-f` and `-F` after `<identifier> <path>`. A field flag takes every following word up to the next option as a value, so a path written after it would be read as a field.
- The result is the application's JSON response. Errors returned by the application are printed with its own message.
- The token needs the `application.proxy` scope.
