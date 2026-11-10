import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { fromStrictSpec, validateFormData } from '../../packages/core/dist/index.js'

const FIXTURES = `http://${process.env.E2E_HOST ?? 'localhost'}:4182`

// What a model writes against form-spec.strict.schema.json for MarketingFlow's
// « Vos canaux »: the acceptance case of the AI profile.
const output = JSON.parse(
  readFileSync(new URL('../../packages/core/__tests__/fixtures/strict-channels.json', import.meta.url), 'utf8')
)
const spec = fromStrictSpec(output)

test.describe('a form written by a model', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FIXTURES}/strict-profile.html`)
    await page.waitForFunction(() => (window as { __ready?: boolean }).__ready)
    await page.evaluate((value) => {
      ;(document.getElementById('renderer') as HTMLElement & { spec: unknown }).spec = value
    }, spec)
  })

  test('renders the boxes, and the account type with its options only once LinkedIn is ticked', async ({ page }) => {
    await expect(page.getByRole('checkbox')).toHaveCount(8)
    await expect(page.getByRole('combobox')).toHaveCount(0)
    await expect(page.getByLabel('Adresse de la page')).toHaveCount(0)

    await page.getByRole('checkbox', { name: 'LinkedIn' }).check()
    await expect(page.getByRole('combobox')).toHaveCount(1)
    await expect(page.getByLabel('Adresse de la page')).toHaveCount(1)

    await page.getByRole('combobox').click()
    await expect(page.getByRole('option')).toHaveText(['Page entreprise', 'Profil personnel'])
  })

  test('the browser and the server give the same verdict', async ({ page }) => {
    const renderer = page.locator('#renderer')
    const verdict = () =>
      renderer.evaluate((el) => (el as HTMLElement & { validate: () => Promise<{ valid: boolean }> }).validate())

    await page.getByRole('checkbox', { name: 'LinkedIn' }).check()
    const data = await page.evaluate(() => (window as { __data?: Record<string, unknown> }).__data ?? {})
    expect((await verdict()).valid).toBe(false)
    expect(validateFormData(spec, data, 'fr').valid).toBe(false)

    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Page entreprise' }).click()
    const answered = await page.evaluate(() => (window as { __data?: Record<string, unknown> }).__data ?? {})
    expect((await verdict()).valid).toBe(true)
    expect(validateFormData(spec, answered, 'fr').valid).toBe(true)
  })
})
