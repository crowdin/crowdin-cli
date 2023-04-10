# CI/CD Integration

Integrate the localization of your Crowdin project into the workflow you've set up on your repo. This includes automatically uploading new source strings to Crowdin and downloading translations. This approach ensures effective synchronization of all translatable texts and helps to avoid potential translation delays before the application deployment.

One way to do this is to use Crowdin CLI with your CI tools. You can use Crowdin CLI with built-in CI tools or with third-party alternatives. If you use GitHub Actions for workflow automation, read more about our [GitHub Crowdin Action](https://github.com/marketplace/actions/crowdin-action), which is also based on Crowdin CLI.

![CI/CD pipeline](/img/ci_cd_pipeline.png)

## Examples

- [Jenkins](https://store.crowdin.com/jenkins)
- [Azure Pipelines](https://store.crowdin.com/azure-pipelines)
- [AWS CodeCommit](https://store.crowdin.com/codecommit)
- [Go Task](https://store.crowdin.com/go-task)
- [Grunt](https://store.crowdin.com/grunt)

## Using NPM package

Crowdin CLI can be [installed via NPM](/installation#npm), so you can easily use it in any CI/CD workflow that has Node installed.

**For example:**

```yml title="GitHub Actions Workflow"
name: Run crowdin cli command

on:
  workflow_dispatch:

jobs:
  cli:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Install Crowdin CLI
        run: npm i -g @crowdin/cli

      - name: Run command
        run: crowdin -V
```

## Further Reading

- [Commands](/commands/crowdin)
