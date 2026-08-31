## Examples

Authorize via browser and store the token in `~/.crowdin.yml`, without generating a configuration file:

```bash
crowdin login
```

This is handy for agentic workflows: you log in once, and every later command (run by you or by a tool) picks the token up from the identity file.

Store an existing personal access token instead of opening a browser:

```bash
crowdin login -T "personal-access-token"
```

For Crowdin Enterprise, pass the organization base URL (it's saved along with the token):

```bash
crowdin login --base-url "https://<organization-name>.api.crowdin.com"
```

## Notes

**Warning**: The browser authorization token you receive has an expiration period of 30 days. This means that after 30 days, the token will expire and you need to run `crowdin login` again to continue using CLI.
