---
description: Discover essential configuration tips and guidelines for the Crowdin CLI.
---

# Configuration

Crowdin CLI uses a YAML configuration file that contains a description of the resources to manage: files to be uploaded into Crowdin and the locations of the corresponding translations.

To use Crowdin CLI, you should first generate your configuration file and then run the tool. By default, Crowdin CLI looks for a configuration file named *crowdin.yaml* or *crowdin.yml* (so you don’t have to specify the file name unless it’s different from *crowdin.yaml*).

To create the configuration file run the following command:

```bash
crowdin init
```

When calling Crowdin CLI in terminal make sure you are in your project root directory. Otherwise, you need to specify a configuration file path using  `--config` option:

```bash
crowdin upload sources --config /path/to/your/config/file
```

### Sample configuration file

```yaml
"project_id": "12"
"api_token": "54e01--your-personal-token--2724a"
"base_path": "."
"base_url": "https://api.crowdin.com"

"preserve_hierarchy": true

"files": [
  {
    "source" : "/locales/**/*",
    "translation" : "/%two_letters_code%/%original_file_name%"
  }
]
```

**Credentials configuration:**

| Name         | Description                                                                                                                        |
|--------------|------------------------------------------------------------------------------------------------------------------------------------|
| `project_id` | Crowdin Project ID                                                                                                                 |
| `api_token`  | Crowdin personal access token. The token owner should have at least Manager permissions in the project                             |
| `base_url`   | Crowdin API base URL. Can be omitted for crowdin.com. For Crowdin Enterprise use the `https://{organization-name}.api.crowdin.com` |

:::info

For more information how to configure Crowdin CLI, check the [Configuration File](https://developer.crowdin.com/configuration-file/) article.

:::

## Further Reading

- [Configuration File](https://developer.crowdin.com/configuration-file/)
- [Commands](/commands/crowdin)
