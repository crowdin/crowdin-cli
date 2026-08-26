// Versions are committed by this config (run via the Bump Version workflow); the publish
// workflow only injects checksums of the released binaries at publish time.
const npmPackages = [
  "darwin-arm64",
  "darwin-x64",
  "linux-x64",
  "linux-arm64",
  "linux-x64-musl",
  "linux-arm64-musl",
  "win32-x64",
].map((platform) => `packages/npm/${platform}/package.json`);

const versionedPackageJsons = ["package.json", "packages/npm/cli/package.json", ...npmPackages];

export default {
  branches: [
    "main"
  ],
  repositoryUrl: "https://github.com/crowdin/crowdin-cli",
  tagFormat: "${version}",
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "@semantic-release/changelog",
      {
        changelogFile: "CHANGELOG.md",
        changelogTitle: "# Changelog"
      },
    ],
    [
      "semantic-release-replace-plugin",
      {
        "replacements": [
          {
            "files": versionedPackageJsons,
            "from": "\"version\": \".*\"",
            "to": "\"version\": \"${nextRelease.version}\"",
            "results": versionedPackageJsons.map((file) => ({
              "file": file,
              "hasChanged": true,
              "numMatches": 1,
              "numReplacements": 1
            })),
            "countMatches": true
          },
          {
            // The launcher pins exact platform-package versions in optionalDependencies
            "files": [
              "packages/npm/cli/package.json"
            ],
            "from": "\"@crowdin/cli-([a-z0-9-]+)\": \".*\"",
            "to": "\"@crowdin/cli-$1\": \"${nextRelease.version}\"",
            "results": [
              {
                "file": "packages/npm/cli/package.json",
                "hasChanged": true,
                "numMatches": 7,
                "numReplacements": 7
              }
            ],
            "countMatches": true
          },
          {
            "files": [
              "packages/aur/pkgbuild/PKGBUILD"
            ],
            "from": "pkgver=.*",
            "to": "pkgver=${nextRelease.version}",
            "results": [
              {
                "file": "packages/aur/pkgbuild/PKGBUILD",
                "hasChanged": true,
                "numMatches": 1,
                "numReplacements": 1
              }
            ],
            "countMatches": true
          },
          {
            "files": [
              "packages/chocolatey/crowdin-cli.nuspec"
            ],
            "from": "<version>.*</version>",
            "to": "<version>${nextRelease.version}</version>",
            "results": [
              {
                "file": "packages/chocolatey/crowdin-cli.nuspec",
                "hasChanged": true,
                "numMatches": 1,
                "numReplacements": 1
              }
            ],
            "countMatches": true
          },
          {
            "files": [
              "packages/chocolatey/tools/chocolateyinstall.ps1"
            ],
            "from": "https://github.com/crowdin/crowdin-cli/releases/download/.*/crowdin.exe",
            "to": "https://github.com/crowdin/crowdin-cli/releases/download/${nextRelease.version}/crowdin.exe",
            "results": [
              {
                "file": "packages/chocolatey/tools/chocolateyinstall.ps1",
                "hasChanged": true,
                "numMatches": 1,
                "numReplacements": 1
              }
            ],
            "countMatches": true
          },
          {
            "files": [
              "packages/exe/CrowdinCLIInstaller.iss"
            ],
            "from": "#define MyAppVersion \".*\"",
            "to": "#define MyAppVersion \"${nextRelease.version}\"",
            "results": [
              {
                "file": "packages/exe/CrowdinCLIInstaller.iss",
                "hasChanged": true,
                "numMatches": 1,
                "numReplacements": 1
              }
            ],
            "countMatches": true
          }
        ]
      }
    ],
    [
      "@semantic-release/git",
      {
        "assets": [
          "package.json",
          "packages/npm/*/package.json",
          "packages/aur/pkgbuild/PKGBUILD",
          "packages/chocolatey/crowdin-cli.nuspec",
          "packages/chocolatey/tools/chocolateyinstall.ps1",
          "packages/exe/CrowdinCLIInstaller.iss",
          "CHANGELOG.md"
        ],
        "message": "chore(release): version ${nextRelease.version} [skip ci]"
      }
    ],
  ],
  verifyConditions: [],
  addChannel: [],
  success: [],
  fail: [],
};
