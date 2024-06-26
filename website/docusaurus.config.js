// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Crowdin CLI',
  tagline: 'Crowdin CLI is a command line tool that allows you to manage and synchronize localization resources with your Crowdin project',
  favicon: 'img/favicon.ico',
  trailingSlash: false,

  // Set the production url of your site here
  url: 'https://crowdin.github.io/',
  baseUrl: '/crowdin-cli',
  organizationName: 'crowdin',
  projectName: 'crowdin-cli',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/crowdin/crowdin-cli/tree/main/website/',
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/lingui/js-lingui/tree/main/website/',
        },
        sitemap: {
          changefreq: "weekly",
          priority: 0.5,
          filename: "sitemap.xml",
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themes: [
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      /** @type {import("@easyops-cn/docusaurus-search-local").PluginOptions} */
      ({
        hashed: true,
        docsRouteBasePath: '/',
        blogRouteBasePath: '/blog',
        indexBlog: true,
      }),
    ]
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      // image: 'img/social-card.jpg',
      navbar: {
        title: 'Crowdin CLI',
        logo: {
          alt: 'Crowdin CLI',
          src: 'img/cli.png',
        },
        items: [
          {
            to: '/blog',
            label: 'Blog',
            position: 'left',
          },
          {
            href: 'https://github.com/crowdin/crowdin-cli',
            label: 'GitHub',
            position: 'right',
          },
          {
            href: 'https://github.com/crowdin/crowdin-cli/releases',
            label: 'Release Notes',
            position: 'right',
          }
        ],
      },
      announcementBar: {
        id: "cli_v4",
        content:
          '🎉 <a target="_blank" rel="noopener noreferrer" href="/crowdin-cli/blog/2024/05/28/cli-v4">Crowdin CLI v4</a> is out! 🥳',
        backgroundColor: "#029e87",
        textColor: "#ffffff",
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Crowdin',
            items: [
              {
                label: 'Why Crowdin?',
                href: 'https://crowdin.com/features/',
              },
              {
                label: 'Developer Portal',
                href: 'https://developer.crowdin.com/crowdin-apps-about/',
              },
              {
                label: 'Knowledge Base',
                href: 'https://support.crowdin.com/translation-process-overview/',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Community Forum',
                href: 'https://community.crowdin.com/',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/crowdin',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Configuration File',
                href: 'https://developer.crowdin.com/configuration-file/',
              },
              {
                label: 'Blog',
                to: '/blog',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/crowdin/crowdin-cli',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Crowdin.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),

  plugins: [
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          {
            from: '/commands/crowdin-generate',
            to: '/commands/crowdin-init',
          },
          {
            from: '/commands/crowdin-list-branches',
            to: '/commands/crowdin-branch-list',
          },
          {
            from: '/commands/crowdin-list-languages',
            to: '/commands/crowdin-language-list',
          },
          {
            from: '/commands/crowdin-list-sources',
            to: '/commands/crowdin-config-sources',
          },
          {
            from: '/commands/crowdin-list-translations',
            to: '/commands/crowdin-config-translations',
          },
          {
            from: '/commands/crowdin-list-project',
            to: '/commands/crowdin-file-list',
          },
          {
            from: '/commands/crowdin-lint',
            to: '/commands/crowdin-config-lint',
          },
          {
            from: '/tutorials/files-management',
            to: '/blog/2024/01/23/files-management'
          }
        ],
      },
    ]
  ],
};

module.exports = config;
