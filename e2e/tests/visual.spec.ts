import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'

/**
 * Pixel-level regression coverage. Functional tests proved blind to a
 * styling bug that shipped for weeks (host button styles leaking into the
 * property-panel tabs); these baselines are the contract that catches the
 * next one. Snapshots are committed per platform: darwin for local work,
 * linux for CI — regenerate with `bun run e2e:visual-update` (darwin) and
 * `bun run e2e:visual-update:linux` (linux, via Docker).
 */

const HOST = process.env.E2E_HOST ?? 'localhost'
const VUE_APP = `http://${HOST}:4180/`
const HTML_APP = `http://${HOST}:4181/`
const HOSTILE = `http://${HOST}:4182/`

const settled = async (page: Page) => {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(250)
}

test.describe('visual', () => {
  test('tanstack playground with a configured brick', async ({ page }) => {
    await page.goto('/playground')
    const builder = page.locator('fk-form-builder')
    await expect(builder.locator('fk-brick-mold-item').first()).toBeVisible()
    // Set the spec through the API rather than dragging: uids stay
    // deterministic, and native drag is flaky in the Linux snapshot
    // container — builder-dnd.spec keeps the functional coverage.
    await builder.evaluate((el) => {
      ;(el as HTMLElement & { spec: unknown }).spec = {
        type: 'panel',
        id: 'column',
        name: 'Form',
        configs: { uid: 'root', key: 'form' },
        children: [
          {
            type: 'input',
            dataType: 'string',
            id: 'text',
            name: 'Text',
            configs: { uid: 'u-name', key: 'full_name', label: 'Full name' },
            validations: [{ validator: 'required' }],
          },
        ],
      }
    })
    await builder.locator('fk-brick-actions').first()
      .click({ force: true, position: { x: 8, y: 8 } })
    await expect(builder.locator('.fk-props__tab--active')).toBeVisible()
    await settled(page)
    // The Data/Spec viewers dump the live spec, whose generated uids are
    // random on every run — mask them, the builder UI is the subject here.
    await expect(page).toHaveScreenshot('tanstack-playground.png', {
      fullPage: true,
      mask: [page.locator('pre')],
    })
  })

  test('tanstack wizard', async ({ page }) => {
    await page.goto('/examples/wizard')
    await expect(page.locator('fk-form-render input').first()).toBeVisible()
    await settled(page)
    await expect(page).toHaveScreenshot('tanstack-wizard.png', { fullPage: true })
  })

  test('vue example', async ({ page }) => {
    await page.goto(VUE_APP)
    await expect(page.locator('fk-form-render input').first()).toBeVisible()
    await expect(page.locator('fk-form-builder fk-brick-actions').first()).toBeVisible()
    await settled(page)
    await expect(page).toHaveScreenshot('vue-home.png', { fullPage: true })
  })

  // The page pins a published version on the CDN, which a release moves before
  // it publishes it: compared with the CDN, a styling change would turn this
  // baseline red on its own PR or on the release's. The pixels are those of the
  // workspace build; plain-html.spec covers the published artifact.
  test('plain html example', async ({ page }) => {
    await page.route(/cdn\.jsdelivr\.net\/npm\/@streamline-pulse\/formkrafter-wc@[\d.]+\/(.*)$/, (route) => {
      const [, path] = route.request().url().match(/formkrafter-wc@[\d.]+\/(.*)$/)!
      return route.fulfill({ path: fileURLToPath(new URL(`../../packages/wc/${path}`, import.meta.url)) })
    })
    await page.goto(HTML_APP)
    await expect(page.locator('fk-form-builder .fk-mold').first()).toBeVisible()
    await expect(page.locator('fk-form-builder fk-brick-actions').first()).toBeVisible()
    await settled(page)
    await expect(page).toHaveScreenshot('html-home.png', { fullPage: true })
  })

  // Every input brick, empty, in the light and the dark theme: one height for
  // one-line controls, the select's chevron away from the border, native date
  // and time parts that follow the theme.
  test('every input brick, light and dark', async ({ page }) => {
    await page.goto(`${HOSTILE}gallery.html`)
    await page.waitForFunction(() => (window as { __ready?: boolean }).__ready)
    await expect(page.locator('#dark fk-brick-render').last()).toBeVisible()
    await settled(page)
    await expect(page).toHaveScreenshot('gallery.png', { fullPage: true })
  })

  test('hostile host page keeps the chrome intact', async ({ page }) => {
    await page.goto(HOSTILE)
    await page.waitForFunction(() => (window as { __ready?: boolean }).__ready)
    const builder = page.locator('fk-form-builder')
    await builder.locator('fk-brick-actions').first()
      .click({ force: true, position: { x: 8, y: 8 } })

    // The explicit contracts first: properties the components pin so that
    // host styling cannot distort them. Assert them directly so a failure
    // names the property instead of pointing at a diff image.
    const tab = page.locator('.fk-props__tab--active').first()
    await expect(tab).toBeVisible()
    await expect(tab).toHaveCSS('border-radius', '0px')
    await expect(tab).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')

    await settled(page)
    await expect(page).toHaveScreenshot('hostile-host.png', { fullPage: true })
  })
})
