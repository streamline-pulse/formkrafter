import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * The plain-HTML example loads the components from a CDN rather than from the
 * workspace build, so this file is the only coverage of the *published*
 * artifact: its exports map, its ESM entry, and the fact that it registers the
 * custom elements on its own with no bundler in the loop.
 *
 * It therefore depends on the network. Give the CDN room on a cold cache.
 */

const HTML_APP = 'http://localhost:4181/'

const form = (page: Page) => page.locator('#renderer')

test.describe('plain HTML via CDN', () => {
  test.slow()

  test.beforeEach(async ({ page }) => {
    await page.goto(HTML_APP)
    await expect(page.getByRole('heading', { name: 'FormKrafter — plain HTML' })).toBeVisible()
  })

  test('the CDN bundle registers the custom elements by itself', async ({ page }) => {
    await expect(page.locator('fk-form-builder .fk-mold').first()).toBeVisible()

    const defined = await page.evaluate(() => [
      !!customElements.get('fk-form-builder'),
      !!customElements.get('fk-form-render'),
    ])
    expect(defined).toEqual([true, true])
  })

  test('properties set in plain JS drive the renderer', async ({ page }) => {
    await expect(form(page).getByLabel('Full name')).toBeVisible()
    await expect(form(page).getByLabel('Email')).toBeVisible()

    await form(page).getByLabel('Full name').fill('Ada Lovelace')
    await expect(page.getByTestId('data')).toContainText('Ada Lovelace')
  })

  test('validate() resolves against the published build', async ({ page }) => {
    const verdict = page.getByTestId('verdict')
    await expect(verdict).toHaveText('—')

    await page.getByTestId('validate').click()
    await expect(verdict).toContainText('"valid": false')
    await expect(verdict).toContainText('fullName')

    await form(page).getByLabel('Full name').fill('Ada Lovelace')
    await form(page).getByLabel('Email').fill('ada@example.com')
    await page.getByTestId('validate').click()

    await expect(verdict).toContainText('"valid": true')
  })
})
