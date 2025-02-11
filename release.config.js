module.exports = {
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
            "files": [
              "build.gradle"
            ],
            "from": "^version '4..*'",
            "to": "version '${nextRelease.version}'",
            "results": [
              {
                "file": "build.gradle",
                "hasChanged": true,
                "numMatches": 1,
                "numReplacements": 1
              }
            ],
            "countMatches": true
          },
          {
            "files": [
              "src/main/resources/crowdin.properties"
            ],
            "from": "application.version=.*",
            "to": "application.version=${nextRelease.version}",
            "results": [
              {
                "file": "src/main/resources/crowdin.properties",
                "hasChanged": true,
                "numMatches": 1,
                "numReplacements": 1
              }
            ],
            "countMatches": true
          },
          {
            "files": [
              "package.json"
            ],
            "from": "\"version\": \".*\"",
            "to": "\"version\": \"${nextRelease.version}\"",
            "results": [
              {
                "file": "package.json",
                "hasChanged": true,
                "numMatches": 1,
                "numReplacements": 1
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
            "from": "https://github.com/crowdin/crowdin-cli/releases/download/.*/crowdin-cli.zip",
            "to": "https://github.com/crowdin/crowdin-cli/releases/download/${nextRelease.version}/crowdin-cli.zip",
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
      "@semantic-release/exec",
      {
        "prepareCmd": "npm install"
      }
    ],
    [
      "@semantic-release/git",
      {
        "assets": [
          "build.gradle",
          "src/main/resources/crowdin.properties",
          "package.json",
          "package-lock.json",
          "packages/aur/pkgbuild/PKGBUILD",
          "packages/chocolatey/*",
          "packages/exe/CrowdinCLIInstaller.iss",
          "CHANGELOG.md"
        ],
        "message": "chore(release): version ${nextRelease.version} [skip ci]"
      }
    ],
    [
      "@semantic-release/npm",
      {
        "npmPublish": false
      }
    ],
  ],
  verifyConditions: [],
  addChannel: [],
  success: [],
  fail: [],
};
