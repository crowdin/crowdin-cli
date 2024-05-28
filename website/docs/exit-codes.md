# Exit Codes

Crowdin CLI provides exit codes to help users understand the results of their operations. Exit codes are numeric values returned by commands executed in the terminal, indicating the success or failure of the operation. These codes can be especially useful when scripting or automating tasks with Crowdin CLI.

| Exit code | Explanation         |
|-----------|---------------------| 
| 0         | Success             |
| 1         | General Error       |
| 2         | Validation Error    |
| 101       | Authorization Error |
| 102       | Not Found Error     |
| 103       | Forbidden Error     |
| 129       | Rate Limit Error    |

:::tip
Help us improve the list of CLI exit codes. If you have any suggestions or ideas, [let us know 💡](https://github.com/crowdin/crowdin-cli/discussions/756)
:::

## Handling Exit Codes

When scripting or automating tasks with Crowdin CLI, it's important to handle exit codes appropriately to ensure robustness and error handling. You can use these exit codes in conditional statements to perform specific actions based on the result of the command execution. Here's an example in a shell script:

```bash
#!/bin/bash

# Run Crowdin CLI command
crowdin upload sources

# Check the exit code
if [ $? -eq 0 ]; then
    echo "Upload completed successfully."
else
    echo "Upload failed. Exit code: $?"
fi
```

In this script, the `crowdin upload sources` command is executed, and then the exit code is checked. If the exit code is `0`, it prints a success message; otherwise, it prints a failure message along with the exit code.
