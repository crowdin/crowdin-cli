; Windows installer for the Crowdin CLI. Packages the standalone win32-x64
; binary (bun run build:win32-x64) and adds the install dir to the user's PATH.

; The publish workflow overrides the version with ISCC /DMyAppVersion=<version>
#ifndef MyAppVersion
#define MyAppVersion "5.0.0-next.5"
#endif
#define MyAppName "Crowdin"
#define MyAppPublisher "OU Crowdin"
#define MyAppURL "https://crowdin.github.io/crowdin-cli"
#define MyAppExeName "crowdin.exe"

[Setup]
; NOTE: The value of AppId uniquely identifies this application.
; Do not use the same AppId value in installers for other applications.
; (To generate a new GUID, click Tools | Generate GUID inside the IDE.)
AppId={{52B80417-16B8-4EFE-B118-6FA64B25CC0F}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL=https://github.com/crowdin/crowdin-cli/issues
AppUpdatesURL=https://github.com/crowdin/crowdin-cli/releases
DefaultDirName={commonpf}\CrowdinCLI
DisableProgramGroupPage=yes
WizardStyle=modern
AppMutex=CrowdinCLISetupMutex
OutputDir=..\..\
OutputBaseFilename=crowdin-installer
Compression=lzma
SolidCompression=yes
ChangesEnvironment=yes
ArchitecturesInstallIn64BitMode=x64
; Bun-compiled binaries require Windows 10 1809+
MinVersion=10.0.17763

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "..\npm\win32-x64\bin\crowdin.exe"; DestDir: "{app}"; Flags: ignoreversion

[Registry]
Root: HKCU; Subkey: "Environment"; ValueType: string; ValueName: "PATH"; ValueData: "{olddata};{app}"; Flags: preservestringtype; Check: NeedsAddPath('{app}')

[Code]
// Skip the PATH entry when it is already present, so upgrades don't append a duplicate
function NeedsAddPath(Param: string): Boolean;
var
  OrigPath: string;
begin
  if not RegQueryStringValue(HKEY_CURRENT_USER, 'Environment', 'PATH', OrigPath) then
  begin
    Result := True;
    exit;
  end;
  Result := Pos(';' + Uppercase(ExpandConstant(Param)) + ';', ';' + Uppercase(OrigPath) + ';') = 0;
end;
