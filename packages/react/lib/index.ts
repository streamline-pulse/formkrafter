// The .js extension is required: Node's ESM resolver demands the exact path,
// and TypeScript emits relative specifiers verbatim (it never rewrites them).
// Without it, `dist/index.js` is unresolvable outside a bundler.
export * from './components/components.js'
