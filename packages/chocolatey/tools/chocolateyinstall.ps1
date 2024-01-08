$ErrorActionPreference = 'Stop'; # stop on all errors
$toolsDir = "$(Split-Path -parent $MyInvocation.MyCommand.Definition)"

$packageName = $env:ChocolateyPackageName
$packageVersion = $env:ChocolateyPackageVersion
$packageArgs = @{
  packageName   = $packageName
  unzipLocation = $toolsDir
  url           = 'https://github.com/crowdin/crowdin-cli/releases/latest/download/crowdin-cli.zip'
  checksum      = 'a8e57a5ca8342864194ea97feaeeab58cc234dc6da7e43eabfba649d4aef3185'
  checksumType  = 'sha256'
}
Install-ChocolateyZipPackage @packageArgs

$unzipDir = Join-Path $toolsDir $packageVersion
Install-ChocolateyEnvironmentVariable -variableName "CROWDIN_HOME" -variableValue "$unzipDir"
Add-BinFile -name crowdin -path "$unzipDir\crowdin.bat"
