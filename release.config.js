module.exports = {
  branches: [
    "cli3"
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
      "@google/semantic-release-replace-plugin",
      {
        "replacements": [
          {
            "files": [
              "build.gradle"
            ],
            "from": "^version '3..*'",
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
              "pkgbuild/PKGBUILD"
            ],
            "from": "pkgver=.*",
            "to": "pkgver=${nextRelease.version}",
            "results": [
              {
                "file": "pkgbuild/PKGBUILD",
                "hasChanged": true,
                "numMatches": 1,
                "numReplacements": 1
              }
            ],
            "countMatches": true
          },
          {
            "files": [
              "chocolatey/crowdin-cli.nuspec"
            ],
            "from": "<version>.*</version>",
            "to": "<version>${nextRelease.version}</version>",
            "results": [
              {
                "file": "chocolatey/crowdin-cli.nuspec",
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
          "pkgbuild/PKGBUILD",
          "chocolatey/*",
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
