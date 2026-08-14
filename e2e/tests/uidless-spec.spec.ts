import { test, expect } from '@playwright/test'

const HOST = process.env.E2E_HOST ?? 'localhost'
const PAGE = `http://${HOST}:4182/uidless-builder.html`

test.describe('specs without uids', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE)
    await page.waitForFunction(() => (window as { __ready?: boolean }).__ready)
  })

  test('a brick can be selected and edited', async ({ page }) => {
    const builder = page.locator('fk-form-builder')
    await builder
      .locator('fk-brick-actions')
      .first()
      .click({ force: true, position: { x: 8, y: 8 } })

    await expect(page.locator('fk-property-panel')).toBeVisible()

    const label = page.locator('fk-property-panel input').nth(1)
    await expect(label).toHaveValue('Name')
    await label.fill('Full name')
    await label.blur()

    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            (window as { __specs?: Array<Record<string, never>> }).__specs?.at(-1)
              ?.children?.[0]?.configs?.label,
        ),
      )
      .toBe('Full name')
  })

  test('nothing the builder emits carries a uid', async ({ page }) => {
    const builder = page.locator('fk-form-builder')
    await builder
      .locator('fk-brick-mold-item', { hasText: 'Email' })
      .first()
      .dragTo(builder.locator('fk-brick-actions').first())

    await expect
      .poll(async () => page.evaluate(() => (window as { __specs?: unknown[] }).__specs?.length))
      .toBeGreaterThan(0)

    const emitted = await page.evaluate(() => ({
      specs: JSON.stringify((window as { __specs?: unknown[] }).__specs),
      patches: JSON.stringify((window as { __patches?: unknown[] }).__patches),
    }))

    expect(emitted.specs).not.toContain('"uid"')
    expect(emitted.patches).not.toContain('"uid"')
  })
})
