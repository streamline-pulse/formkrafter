import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Automated accessibility gate. axe cannot prove a page accessible, but
 * every violation it does report is real — so the budget is zero, and the
 * failure message lists each violation with the offending nodes.
 */

// The plain-HTML example is deliberately absent: it runs the published CDN
// build, so a11y fixes only reach it one release after they land — scanning
// it would keep CI red for exactly that release lag. The workspace build is
// what the other pages cover.
const VUE_APP = 'http://localhost:4180/'

const scan = async (page: Page) => {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const summary = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.slice(0, 5).map((n) => n.target.join(' ')),
  }))
  expect(summary, JSON.stringify(summary, null, 2)).toEqual([])
}

test.describe('accessibility', () => {
  test('tanstack home', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('main')).toBeVisible()
    await scan(page)
  })

  test('tanstack playground with the panel open', async ({ page }) => {
    await page.goto('/playground')
    const builder = page.locator('fk-form-builder')
    await expect(builder.locator('fk-brick-mold-item').first()).toBeVisible()
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
          },
        ],
      }
    })
    await builder.locator('fk-brick-actions').first()
      .click({ force: true, position: { x: 8, y: 8 } })
    await expect(page.locator('.fk-props__tab--active')).toBeVisible()
    await scan(page)
  })

  test('tanstack wizard', async ({ page }) => {
    await page.goto('/examples/wizard')
    await expect(page.locator('fk-form-render input').first()).toBeVisible()
    await scan(page)
  })

  test('vue example', async ({ page }) => {
    await page.goto(VUE_APP)
    await expect(page.locator('fk-form-render input').first()).toBeVisible()
    await scan(page)
  })
})
