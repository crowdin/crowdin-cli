import type * as Preset from '@docusaurus/preset-classic';
import type { Config } from '@docusaurus/types';
import { themes as prismThemes } from 'prism-react-renderer';

const config: Config = {
  title: 'Crowdin CLI',
  tagline:
    'Crowdin CLI is a command line tool that allows you to manage and synchronize localization resources with your Crowdin project',
  favicon: 'img/favicon.ico',
  trailingSlash: false,

  url: 'https://crowdin.github.io/',
  baseUrl: '/crowdin-cli',
  organizationName: 'crowdin',
  projectName: 'crowdin-cli',

  onBrokenLinks: 'throw',

  markdown: {
    // .md files are plain CommonMark (the generated command reference is not MDX-safe),
    // .mdx files opt in to MDX.
    format: 'detect',
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/crowdin/crowdin-cli/tree/main/website/',
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/crowdin/crowdin-cli/tree/main/website/',
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          filename: 'sitemap.xml',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        docsRouteBasePath: '/',
        blogRouteBasePath: '/blog',
        indexBlog: true,
      },
    ],
  ],

  themeConfig: {
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
        },
      ],
    },
    colorMode: {
      respectPrefersColorScheme: true,
    },
    announcementBar: {
      id: 'context_enrichment',
      content:
        '✨ <a target="_blank" rel="noopener noreferrer" href="/crowdin-cli/blog/2026/02/23/context-enrichment">Context Enrichment with AI Agents and CLI</a> — learn how to improve your translation accuracy with AI',
      backgroundColor: '#029e87',
      textColor: '#ffffff',
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
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,

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
            from: '/commands/crowdin-pre-translate',
            to: '/commands/crowdin-auto-translate',
          },
          {
            from: '/tutorials/files-management',
            to: '/blog/2024/01/23/files-management',
          },
        ],
      },
    ],
  ],
};

export default config;
