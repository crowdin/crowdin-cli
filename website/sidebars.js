/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  tutorialSidebar: [
    'intro',
    'installation',
    'configuration',
    'autocompletion',
    {
      type: 'category',
      label: 'Commands',
      collapsible: true,
      collapsed: false,
      items: [
        'commands/crowdin',
        'commands/crowdin-init',
        'commands/crowdin-pre-translate',
        {
          type: 'category',
          label: 'crowdin upload',
          link: {
            type: 'doc',
            id: 'commands/crowdin-upload'
          },
          collapsible: true,
          collapsed: true,
          items: [
            'commands/crowdin-upload-sources',
            'commands/crowdin-upload-translations',
          ]
        },
        {
          type: 'category',
          label: 'crowdin download',
          link: {
            type: 'doc',
            id: 'commands/crowdin-download'
          },
          collapsible: true,
          collapsed: true,
          items: [
            'commands/crowdin-download-translations',
            'commands/crowdin-download-sources',
          ]
        },
        {
          type: 'category',
          label: 'crowdin status',
          link: {
            type: 'doc',
            id: 'commands/crowdin-status'
          },
          collapsible: true,
          collapsed: true,
          items: [
            'commands/crowdin-status-translation',
            'commands/crowdin-status-proofreading',
          ]
        },
        {
          type: 'category',
          label: 'crowdin file',
          link: {
            type: 'doc',
            id: 'commands/crowdin-file'
          },
          collapsible: true,
          collapsed: true,
          items: [
            'commands/crowdin-file-list',
            'commands/crowdin-file-upload',
            'commands/crowdin-file-download',
            'commands/crowdin-file-delete',
          ]
        },
        {
          type: 'category',
          label: 'crowdin branch',
          link: {
            type: 'doc',
            id: 'commands/crowdin-branch'
          },
          collapsible: true,
          collapsed: true,
          items: [
            'commands/crowdin-branch-list',
            'commands/crowdin-branch-add',
            'commands/crowdin-branch-clone',
            'commands/crowdin-branch-merge',
            'commands/crowdin-branch-delete',
            'commands/crowdin-branch-edit',
          ]
        },
        {
          type: 'category',
          label: 'crowdin string',
          link: {
            type: 'doc',
            id: 'commands/crowdin-string'
          },
          collapsible: true,
          collapsed: true,
          items: [
            'commands/crowdin-string-list',
            'commands/crowdin-string-add',
            'commands/crowdin-string-edit',
            'commands/crowdin-string-delete',
          ]
        },
        {
          type: 'category',
          label: 'crowdin bundle',
          link: {
            type: 'doc',
            id: 'commands/crowdin-bundle'
          },
          collapsible: true,
          collapsed: true,
          items: [
            'commands/crowdin-bundle-list',
            'commands/crowdin-bundle-add',
            'commands/crowdin-bundle-download',
          ]
        },

        {
          type: 'category',
          label: 'crowdin config',
          link: {
            type: 'doc',
            id: 'commands/crowdin-config'
          },
          collapsible: true,
          collapsed: true,
          items: [
            'commands/crowdin-config-lint',
            'commands/crowdin-config-sources',
            'commands/crowdin-config-translations',
          ]
        },
        {
          type: 'category',
          label: 'crowdin project',
          link: {
            type: 'doc',
            id: 'commands/crowdin-project'
          },
          collapsible: true,
          collapsed: true,
          items: [
            'commands/crowdin-project-list',
            'commands/crowdin-project-add',
            'commands/crowdin-project-browse',
          ]
        },
        {
          type: 'category',
          label: 'crowdin language',
          link: {
            type: 'doc',
            id: 'commands/crowdin-language'
          },
          collapsible: true,
          collapsed: true,
          items: [
            'commands/crowdin-language-list',
          ]
        },
        {
          type: 'category',
          label: 'crowdin glossary',
          link: {
            type: 'doc',
            id: 'commands/crowdin-glossary'
          },
          collapsible: true,
          collapsed: true,
          items: [
            'commands/crowdin-glossary-list',
            'commands/crowdin-glossary-upload',
            'commands/crowdin-glossary-download',
          ]
        },
        {
          type: 'category',
          label: 'crowdin tm',
          link: {
            type: 'doc',
            id: 'commands/crowdin-tm'
          },
          collapsible: true,
          collapsed: true,
          items: [
            'commands/crowdin-tm-list',
            'commands/crowdin-tm-upload',
            'commands/crowdin-tm-download',
          ]
        },
        {
          type: 'category',
          label: 'crowdin comment',
          link: {
            type: 'doc',
            id: 'commands/crowdin-comment'
          },
          collapsible: true,
          collapsed: true,
          items: [
            'commands/crowdin-comment-list',
            'commands/crowdin-comment-add',
            'commands/crowdin-comment-resolve',
          ]
        },
        {
          type: 'category',
          label: 'crowdin task',
          link: {
            type: 'doc',
            id: 'commands/crowdin-task'
          },
          collapsible: true,
          collapsed: true,
          items: [
            'commands/crowdin-task-list',
            'commands/crowdin-task-add',
          ]
        },
        {
          type: 'category',
          label: 'crowdin distribution',
          link: {
            type: 'doc',
            id: 'commands/crowdin-distribution'
          },
          collapsible: true,
          collapsed: true,
          items: [
            'commands/crowdin-distribution-list',
            'commands/crowdin-distribution-add',
            'commands/crowdin-distribution-release',
          ]
        },
        {
          type: 'category',
          label: 'crowdin screenshot',
          link: {
            type: 'doc',
            id: 'commands/crowdin-screenshot'
          },
          collapsible: true,
          collapsed: true,
          items: [
            'commands/crowdin-screenshot-list',
            'commands/crowdin-screenshot-upload',
            'commands/crowdin-screenshot-delete',
          ]
        },
        {
          type: 'category',
          label: 'crowdin label',
          link: {
            type: 'doc',
            id: 'commands/crowdin-label'
          },
          collapsible: true,
          collapsed: true,
          items: [
            'commands/crowdin-label-list',
            'commands/crowdin-label-add',
            'commands/crowdin-label-delete',
          ]
        }
      ],
    },
    'ci-cd',
    'advanced',
    'exit-codes',
    'faq'
  ],
};

module.exports = sidebars;
