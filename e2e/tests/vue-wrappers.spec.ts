import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * The Vue wrappers are published and documented but have no other runtime
 * coverage: everything else in this suite exercises the React/TanStack app.
 * These tests drive the whole public surface of the Vue bindings — both
 * components, the three events, and validate() through a template ref.
 */

const VUE_APP = 'http://localhost:4180/'

/**
 * The page mounts a renderer demo and a builder over separate specs, and the
 * builder renders its own <fk-form-render> internally for the canvas preview.
 * Field assertions therefore go through the renderer demo's own container.
 */
const form = (page: Page) => page.locator('.demo__form')

const openDemo = async (page: Page, id: string) => {
  await page.getByTestId(`tab-${id}`).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto(VUE_APP)
  await expect(page.getByRole('heading', { name: 'FormKrafter — Vue 3' })).toBeVisible()
})

test('renders the builder and the renderer from Vue', async ({ page }) => {
  // The palette proves the web component booted inside Vue.
  await expect(page.locator('fk-form-builder .fk-mold').first()).toBeVisible()

  await expect(form(page).getByLabel('Full name')).toBeVisible()
  await expect(form(page).getByLabel('Email')).toBeVisible()
})

test('registering a custom brick keeps the built-ins registered', async ({ page }) => {
  const palette = page.locator('fk-form-builder .fk-mold')

  // The custom brick is there…
  await expect(palette.filter({ hasText: 'Rating' })).toHaveCount(1)

  // …and so are the built-ins. Registering a custom brick before mount used
  // to suppress all 30 of them.
  await expect(palette.filter({ hasText: 'Text area' })).toHaveCount(1)
  expect(await palette.count()).toBeGreaterThan(20)
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
  await expect(verdict).toContainText('"valid": false')
  await expect(verdict).toContainText('fullName')

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

test('a rule reveals a field and excludes it from validation while hidden', async ({ page }) => {
  await openDemo(page, 'rules')

  // Hidden while the rule does not match — and not blocking validation.
  await expect(form(page).getByLabel('Shipping address')).toBeHidden()
  await page.getByTestId('validate').click()
  await expect(page.getByTestId('verdict')).toContainText('"valid": false')
  await expect(page.getByTestId('verdict')).not.toContainText('address')

  // Choosing Shipping reveals it.
  await form(page).getByRole('combobox').click()
  await page.getByRole('option', { name: 'Shipping' }).click()

  await expect(form(page).getByLabel('Shipping address')).toBeVisible()
})

test('the data grid validates each row on its own', async ({ page }) => {
  await openDemo(page, 'grid')

  await form(page).getByRole('button', { name: /add/i }).first().click()
  await page.getByTestId('validate').click()

  // Row-scoped keys, not flat ones.
  await expect(page.getByTestId('verdict')).toContainText('members[0].name')
})

test('a nested form is resolved through the spec source service', async ({ page }) => {
  await openDemo(page, 'nested')

  // Street comes from the referenced spec, fetched asynchronously.
  await expect(form(page).getByLabel('Street')).toBeVisible()
  await expect(form(page).getByRole('group', { name: 'Delivery address' })).toBeVisible()
})

test('the custom brick renders and validates like a built-in', async ({ page }) => {
  await openDemo(page, 'custom')

  const stars = form(page).getByRole('button', { name: /stars$/ })
  await expect(stars).toHaveCount(5)

  await page.getByTestId('validate').click()
  await expect(page.getByTestId('verdict')).toContainText('"valid": false')

  await stars.nth(3).click()
  await expect(page.getByTestId('data')).toContainText('"rating": 4')

  await page.getByTestId('validate').click()
  await expect(page.getByTestId('verdict')).toContainText('"valid": true')
})
