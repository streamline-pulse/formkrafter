import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * The Vue wrappers are published and documented but have no other runtime
 * coverage: everything else in this suite exercises the React/TanStack app.
 * These tests drive the whole public surface of the Vue bindings — props,
 * the three events, and the validate() method reached through a template ref.
 */

const VUE_APP = 'http://localhost:4180/'

/**
 * The page mounts a builder and a renderer over the same spec, so field labels
 * appear twice — and the builder renders its own <fk-form-render> internally
 * for the canvas preview, so that tag alone is not a unique scope. Field
 * assertions go through the standalone renderer's own panel.
 */
const form = (page: Page) => page.getByTestId('renderer-panel')

test.beforeEach(async ({ page }) => {
  await page.goto(VUE_APP)
  await expect(page.getByRole('heading', { name: 'FormKrafter — Vue 3' })).toBeVisible()
})

test('renders the builder and the renderer from one spec', async ({ page }) => {
  // Builder: the palette proves the web component booted inside Vue.
  await expect(page.locator('fk-form-builder .fk-mold').first()).toBeVisible()

  // Renderer: fields come from the same spec object.
  await expect(form(page).getByLabel('Full name')).toBeVisible()
  await expect(form(page).getByLabel('Email')).toBeVisible()
})

test('formDataChange reaches Vue state as the user types', async ({ page }) => {
  await form(page).getByLabel('Full name').fill('Ada Lovelace')

  await expect(page.getByTestId('data')).toContainText('Ada Lovelace')
  await expect(page.getByTestId('data')).toContainText('fullName')
})

test('validate() through a template ref returns the verdict', async ({ page }) => {
  const verdict = page.getByTestId('verdict')
  await expect(verdict).toHaveText('—')

  await page.getByTestId('validate').click()

  // Empty required fields → invalid, with per-key messages.
  await expect(verdict).toContainText('"valid": false')
  await expect(verdict).toContainText('fullName')

  // Fill everything in and the same call now passes.
  await form(page).getByLabel('Full name').fill('Ada Lovelace')
  await form(page).getByLabel('Email').fill('ada@example.com')
  await page.getByTestId('validate').click()

  await expect(verdict).toContainText('"valid": true')
})

test('the locale prop re-resolves localized labels', async ({ page }) => {
  await expect(form(page).getByLabel('Full name')).toBeVisible()

  await page.getByTestId('toggle-locale').click()

  await expect(form(page).getByLabel('Nom complet')).toBeVisible()
  await expect(form(page).getByLabel('Full name')).toBeHidden()
})
