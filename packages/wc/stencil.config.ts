import { reactOutputTarget } from '@stencil/react-output-target'
import { vueOutputTarget } from '@stencil/vue-output-target'

import type { Config } from '@stencil/core'

const isDevServer = process.argv.includes('--dev')

const libraryTargets: NonNullable<Config['outputTargets']> = [
  {
    type: 'dist',
    esmLoaderPath: '../loader',
  },
  {
    type: 'dist-custom-elements',
    customElementsExportBehavior: 'auto-define-custom-elements',
    externalRuntime: false,
  },
  reactOutputTarget({
    outDir: '../react/lib/components/',
  }),
  vueOutputTarget({
    componentCorePackage: '@streamline-pulse/formkrafter-wc',
    proxiesFile: '../vue/lib/components.ts',
    includeImportCustomElements: true,
    customElementsDir: 'dist/components',
  }),
]

export const config: Config = {
  namespace: 'formkrafter-wc',
  globalStyle: 'src/global/formkrafter.css',
  outputTargets: [
    {
      type: 'www',
      serviceWorker: null,
    },
    ...(isDevServer ? [] : libraryTargets),
  ],
}
