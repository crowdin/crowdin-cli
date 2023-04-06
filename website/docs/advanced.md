# Advanced Usage

### Using CLI with Proxy Server

Crowdin CLI provides the possibility to work with a proxy server. Each time you run a command, Crowdin CLI checks whether the operating system has the configured environment variables.

Supported environment variables:

- `HTTP_PROXY_HOST` - the name or the IP address of the host at which the proxy server is located
- `HTTP_PROXY_PORT` - the port used by the proxy server for listening
- `HTTP_PROXY_USER` - the username used for authentication on a proxy server
- `HTTP_PROXY_PASSWORD` - the password used for authentication on a proxy server

### Ignoring hidden files during upload sources

To ignore hidden files during sources upload, add the following to your configuration file:

```yml title="crowdin.yml"
settings: {
    "ignore_hidden_files": false
}
```
