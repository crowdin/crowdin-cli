$ErrorActionPreference = 'Stop'; # stop on all errors
$toolsDir = "$(Split-Path -parent $MyInvocation.MyCommand.Definition)"

# The download URL is version-bumped on release (see release.config.js); the checksum
# placeholder is filled in by the publish workflow (.github/workflows/publish.yml) with
# the hash of the freshly-released binary.
# Chocolatey auto-shims crowdin.exe from the tools dir onto PATH as `crowdin`.
Get-ChocolateyWebFile -PackageName 'crowdin-cli' `
  -FileFullPath (Join-Path $toolsDir 'crowdin.exe') `
  -Url 'https://github.com/crowdin/crowdin-cli/releases/download/5.0.0-next.4/crowdin-win32-x64.exe' `
  -Checksum '__CHECKSUM__' `
  -ChecksumType 'sha256'
