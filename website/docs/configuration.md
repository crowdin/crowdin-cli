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

```yml title="crowdin.yml"
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

## Environment Variables

Crowdin CLI supports the use of environment variables for configuration. For example, you can load the API credentials from an environment variable:

```yml title="crowdin.yml"
"project_id_env": "CROWDIN_PROJECT_ID"
"api_token_env": "CROWDIN_PERSONAL_TOKEN"
"base_path_env": "CROWDIN_BASE_PATH"
"base_url_env": "CROWDIN_BASE_URL"
```

Environment variables have lower priority and will be used if any of the parameters are missing:

```yml title="crowdin.yml"
"project_id_env": "CROWDIN_PROJECT_ID"      # Low priority
"api_token_env": "CROWDIN_PERSONAL_TOKEN"   # Low priority
"base_path_env": "CROWDIN_BASE_PATH"        # Low priority
"base_url_env": "CROWDIN_BASE_PATH"         # Low priority

"project_id": "project-id"                  # High priority
"api_token": "personal-access-token"        # High priority
"base_path": "/project-base-path"           # High priority
"base_url": "https://api.crowdin.com"       # High priority
```

The CLI will also **automatically** pick up the environment variables if they are set in the shell. The supported environment variables are:

| Variable Name            | Description                                                                                                                                                             |
|--------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `CROWDIN_PERSONAL_TOKEN` | Personal Access Token required for authentication                                                                                                                       |
| `CROWDIN_PROJECT_ID`     | Numerical ID of the Crowdin project                                                                                                                                     |
| `CROWDIN_BASE_URL`       | Base URL of Crowdin server for API requests execution (`https://api.crowdin.com` for crowdin.com, `https://{organization-name}.api.crowdin.com` for Crowdin Enterprise) |
| `CROWDIN_BASE_PATH`      | Path to your project directory on a local machine (default: `.`)                                                                                                        |

## Split Project Configuration and API Credentials

The `crowdin.yml` file contains a description of the resources to manage and API credentials (`project_id`, `api_token`, `base_path`, `base_url`).

It means that it's unsafe to commit this file into the code repository because the API key would be accessible to other users. Crowdin CLI supports two types of configuration files:

- a description of the resources to manage, residing in the project directory
- API credentials, probably residing in `$HOME/.crowdin.yml`

:::note
API credentials from the `.crowdin.yml` configuration file have higher priority than credentials from the project directory(`crowdin.yml`).
:::

If you need to run a command with user-specific credentials (for example, `upload sources`), run the following command:

```bash
crowdin upload sources --identity 'path-to-user-credentials-file'
```

But if user-specific credentials file residing in `$HOME/.crowdin.yml` you can run:

```bash
crowdin upload sources
```

## Further Reading

- [Configuration File](https://developer.crowdin.com/configuration-file/)
- [Commands](/commands/crowdin)
