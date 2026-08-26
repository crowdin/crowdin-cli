## Examples

Instead of interactive mode, you can also pass the parameters directly to the command:

```bash
crowdin init \
  --base-path "." \
  --base-url "https://api.crowdin.com" \
  -i "1" \
  -T "personal-access-token" \
  -s "/locales/**/*" \
  -t "/%two_letters_code%/%original_file_name%"
```

As a result, the configuration file will be filled with the passed parameters.

## Notes

**Warning**: The browser authorization token you receive has an expiration period of 30 days. This means that after 30 days, the token will expire and you need to generate a new token to continue using CLI.
