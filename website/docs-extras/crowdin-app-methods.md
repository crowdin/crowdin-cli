## Examples

List the API methods an installed application declares:

```bash
crowdin app methods zendesk-guide
```

Describe one method, with its parameters and request body when the application publishes an OpenAPI document:

```bash
crowdin app methods zendesk-guide crowdin-update --output json
```

Pick one verb when a path is declared for several:

```bash
crowdin app methods zendesk-guide jobs --method DELETE
```

## Notes

The method list comes from the application's manifest. Parameters and the request body are read from the application's OpenAPI document when one is available, and are left out otherwise.
