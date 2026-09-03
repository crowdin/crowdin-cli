## Examples

Authorize via browser and store the token in `~/.crowdin.yml`, without generating a configuration file:

```bash
crowdin login
```

This is handy for agentic workflows: you log in once, and every later command (run by you or by a tool) picks the token up from the identity file.

For Crowdin Enterprise, the organization comes from the account you sign in to in the browser and is saved along with the token, so the command stays the same.

## Notes

**Warning**: The browser authorization token you receive has an expiration period of 30 days. This means that after 30 days, the token will expire and you need to run `crowdin login` again to continue using CLI.
