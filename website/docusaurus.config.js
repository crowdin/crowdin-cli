// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Crowdin CLI',
  tagline: 'Crowdin CLI is a command line tool that allows you to manage and synchronize localization resources with your Crowdin project',
  favicon: 'img/favicon.ico',

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
          editUrl: 'https://github.com/crowdin/crowdin-cli/tree/cli3/website/',
        },
        blog: false,
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
        indexBlog: false,
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
            href: 'https://github.com/crowdin/crowdin-cli',
            label: 'GitHub',
            position: 'right',
          },
        ],
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
};

module.exports = config;
