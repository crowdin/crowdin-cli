---
description: Install Crowdin CLI easily with clear instructions on the installation page. Get started quickly and manage localization seamlessly with Crowdin CLI.
---

# Installation

## Homebrew for macOS

To install the Crowdin CLI with [Homebrew](https://brew.sh/) (the package manager for macOS):

```bash
brew tap crowdin/crowdin
```

```bash
brew install crowdin@3
```

[Homebrew Tap Reference](https://github.com/crowdin/homebrew-crowdin).

## Windows

### Installer

Download and run [installer for Windows](https://downloads.crowdin.com/cli/v3/crowdin.exe).

### Chocolatey

```bash
choco install crowdin-cli
```

[Chocolatey Package Reference](https://community.chocolatey.org/packages/crowdin-cli).

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
sudo apt-get update && sudo apt-get install crowdin3
```

To install the Crowdin CLI manually:

```bash
wget https://artifacts.crowdin.com/repo/deb/crowdin3.deb -O crowdin.deb
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
```

And your repository is ready for use. You can now install Crowdin CLI with one of the following commands:

```bash
sudo yum install crowdin3
sudo dnf install crowdin3
```

To install the Crowdin CLI manually:

```bash
wget https://artifacts.crowdin.com/repo/rpm/crowdin3.rpm -O crowdin.rpm
sudo rpm -U crowdin3.rpm
```

## Arch Linux

Visit the [Crowdin CLI package page](https://aur.archlinux.org/packages/crowdin-cli) on Arch Linux user repository.

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

## Standalone version

Crowdin CLI can be installed as a stand-alone Java application. [Download for macOS, Linux and Windows](https://downloads.crowdin.com/cli/v3/crowdin-cli.zip)

### Installation on Linux and macOS

- Download `crowdin-cli.zip` using the link above
- Unpack it
- Run `./install-crowdin-cli.sh` in the terminal with sudo rights in order to add crowdin command to your terminal

### Installation on Windows

- Download `crowdin-cli.zip` using the link above
- Extract it's content to the place where you want Crowdin CLI to be stored
- Open Command Prompt as an Administrator
  - Click Start
  - In the *Start Search* box, type `cmd`, and then press `Ctrl`+`Shift`+`Enter`
  - If the *User Account Control* dialog box appears, confirm that the action it displays is what you want, and then click _Continue_
- Run `setup-crowdin.bat` script in order to add crowdin command to the Command Prompt
- Restart your Command Prompt

## Nix package manager

```bash
nix-shell -p crowdin-cli
```

A nix-shell will temporarily modify your `$PATH` environment variable. This can be used to try a piece of software before deciding to permanently install it.

[Nix package reference](https://search.nixos.org/packages?show=crowdin-cli).

## Further Reading

- [Commands](/commands/crowdin)
