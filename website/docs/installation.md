---
description: Install Crowdin CLI easily with clear instructions on the installation page. Get started quickly and manage localization seamlessly with Crowdin CLI.
---

# Installation

## Homebrew

To install the Crowdin CLI with [Homebrew](https://brew.sh/) (the package manager for macOS):

```bash
brew tap crowdin/crowdin
```

```bash
brew install crowdin@5
```

[Homebrew Tap Reference](https://github.com/crowdin/homebrew-crowdin).

## NPM

```bash
npm i -g @crowdin/cli
```

[NPM Package Reference](https://www.npmjs.com/package/@crowdin/cli).

## Docker

```bash
docker pull crowdin/cli
```

[Docker Container Reference](https://hub.docker.com/r/crowdin/cli).

## Windows

### WinGet

```bash
winget install Crowdin.CrowdinCLI
```

```bash
winget upgrade Crowdin.CrowdinCLI
```

```bash
winget uninstall Crowdin.CrowdinCLI
```

You can also search for the package:

```bash
winget search crowdin
```

### Chocolatey

```bash
choco install crowdin-cli
```

[Chocolatey Package Reference](https://community.chocolatey.org/packages/crowdin-cli).

### Installer

Download and run [installer for Windows](https://github.com/crowdin/crowdin-cli/releases/latest/download/crowdin.exe).

## Debian

We sign all our packages with the Crowdin Signing Key.

Download and install the public signing key:

```bash
wget -qO - https://artifacts.crowdin.com/repo/GPG-KEY-crowdin | sudo apt-key add -
```

Using the following command, create the `crowdin.list` file in the `/etc/apt/sources.list.d` directory:

```bash
echo "deb https://artifacts.crowdin.com/repo/deb/ /" > /etc/apt/sources.list.d/crowdin.list
```

And your repository is ready for use. You can install the Crowdin CLI Debian package with:

```bash
sudo apt-get update && sudo apt-get install crowdin
```

To install the Crowdin CLI manually:

```bash
wget https://artifacts.crowdin.com/repo/deb/crowdin.deb -O crowdin.deb
sudo dpkg -i crowdin.deb
```

## RPM

We sign all our packages with the Crowdin Signing Key.

Download and install the public signing key:

```bash
sudo rpm --import https://artifacts.crowdin.com/repo/GPG-KEY-crowdin
```

Installing from the RPM repository

Create a file called `crowdin.repo` in the `/etc/yum.repos.d` directory containing:

```ini
[crowdin]
name=Crowdin repository
baseurl=https://artifacts.crowdin.com/repo/rpm
gpgcheck=1
gpgkey=https://artifacts.crowdin.com/repo/GPG-KEY-crowdin
enabled=1
autorefresh=1
```

And your repository is ready for use. You can now install Crowdin CLI with one of the following commands:

```bash
sudo yum install crowdin
sudo dnf install crowdin
```

To install the Crowdin CLI manually:

```bash
wget https://artifacts.crowdin.com/repo/rpm/crowdin.rpm -O crowdin.rpm
sudo rpm -U crowdin.rpm
```

## Arch Linux

Visit the [Crowdin CLI package page](https://aur.archlinux.org/packages/crowdin-cli) on Arch Linux user repository.

## Standalone version

Crowdin CLI is also distributed as a single self-contained binary for macOS, Linux, and Windows - with no runtime to install. Download the binary for your platform from the [latest GitHub release](https://github.com/crowdin/crowdin-cli/releases/latest).

### Installation on Linux and macOS

- Download the binary for your platform using the link above
- Make it executable: `chmod +x crowdin`
- Move it to a directory on your `PATH` (for example, `sudo mv crowdin /usr/local/bin/crowdin`)
- Run `crowdin --version` to verify the installation

### Installation on Windows

- Download the `.exe` for Windows using the link above
- Move it to the folder where you want Crowdin CLI to be stored
- Add that folder to your `PATH` environment variable
- Open a new Command Prompt and run `crowdin --version` to verify the installation

## Nix package manager

```bash
nix-shell -p crowdin-cli
```

A nix-shell will temporarily modify your `$PATH` environment variable. This can be used to try a piece of software before deciding to permanently install it.

[Nix package reference](https://search.nixos.org/packages?show=crowdin-cli).

## Further Reading

- [Commands](/commands/crowdin)
