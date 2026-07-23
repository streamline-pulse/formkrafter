# FormKrafter end-to-end tests

Playwright tests that exercise the real built app (`examples/tanstack-start`) in Chromium: builder drag & drop, wizard step validation, locale switching, keyboard-only combobox, nested-form expansion and the server validation function.

```sh
bun run e2e        # from the repo root: builds the example app, then runs the suite
bun run e2e:only   # skip the app build (reuses the last build / running preview server)
```

The Playwright web server starts `vite preview` on port 4179 (an already-running server is reused outside CI). First-time setup:

```sh
bunx playwright install chromium
```

Debugging: `cd e2e && bunx playwright test --ui` (or `--headed`, `--debug`). On CI failure the HTML report is uploaded as the `playwright-report` artifact.
