import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // Leave <fk-*> elements to the browser's custom element registry
          // instead of letting Vue try to resolve them as components.
          isCustomElement: (tag) => tag.startsWith('fk-'),
        },
      },
    }),
  ],
})
