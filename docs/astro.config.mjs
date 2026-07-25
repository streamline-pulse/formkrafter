import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'
import starlightLinksValidator from 'starlight-links-validator'

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
      components: {
        // Adds a section eyebrow above the page title, derived from the
        // sidebar group so it stays translated and in sync automatically.
        PageTitle: './src/components/docs/PageTitle.astro',
      },
      plugins: [
        // Fails the build on any broken internal link or heading anchor —
        // Starlight itself stays silent about them.
        starlightLinksValidator({ errorOnRelativeLinks: false }),
      ],
      sidebar: [
        {
          label: 'Start here',
          translations: { fr: 'Commencer' },
          items: [
            { slug: 'overview' },
            { slug: 'getting-started' },
            { slug: 'demo' },
          ],
        },
        {
          label: 'Guides',
          translations: { fr: 'Guides' },
          items: [
            { slug: 'guides/form-specs' },
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
          translations: { fr: 'Migration' },
          items: [{ slug: 'guides/formio-migration' }],
        },
        {
          label: 'Reference',
          translations: { fr: 'Référence' },
          items: [
            { slug: 'reference/components' },
            { slug: 'reference/packages' },
          ],
        },
      ],
    }),
  ],
})
