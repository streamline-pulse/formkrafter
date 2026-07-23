import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

export default defineConfig({
  site: 'https://streamline-pulse.github.io',
  base: '/formkrafter',
  integrations: [
    starlight({
      title: 'FormKrafter',
      description:
        'Framework-agnostic drag & drop form builder — Web Components, React, Vue.',
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        fr: { label: 'Français', lang: 'fr' },
      },
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/streamline-pulse/formkrafter',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/streamline-pulse/formkrafter/edit/main/docs/',
      },
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'Start here',
          translations: { fr: 'Commencer' },
          items: [
            { slug: 'getting-started' },
            { slug: 'demo' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { slug: 'guides/bricks' },
            { slug: 'guides/validation' },
            { slug: 'guides/rules' },
            { slug: 'guides/services' },
            { slug: 'guides/nested-forms' },
            { slug: 'guides/theming' },
            { slug: 'guides/i18n' },
          ],
        },
        {
          label: 'Migration',
          items: [{ slug: 'guides/formio-migration' }],
        },
        {
          label: 'Reference',
          translations: { fr: 'Référence' },
          items: [{ slug: 'reference/packages' }],
        },
      ],
    }),
  ],
})
