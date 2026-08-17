import { test, expect } from '@playwright/test'

const FIXTURES = `http://${process.env.E2E_HOST ?? 'localhost'}:4182`

test.describe('runtime context', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FIXTURES}/runtime-context.html`)
    await expect(page.getByLabel('Full name')).toBeVisible()
  })

  test('a dotted path in optionsUrl resolves through context', async ({ page }) => {
    await page.getByRole('combobox', { name: 'City' }).click()
    await expect(page.getByRole('option', { name: 'Porto-Novo' })).toBeVisible()
  })

  test('a paginated { data: [...] } envelope resolves with no config', async ({
    page,
  }) => {
    await page.getByRole('combobox', { name: 'Envelope' }).click()
    await expect(page.getByRole('option', { name: 'Beta' })).toBeVisible()
  })

  test('optionsPath addresses a non-standard envelope', async ({ page }) => {
    await page.getByRole('combobox', { name: 'Nested' }).click()
    await expect(page.getByRole('option', { name: 'Delta' })).toBeVisible()
  })

  test('context feeds visibility rules', async ({ page }) => {
    await expect(page.getByLabel('Seats')).toBeVisible()

    await page.evaluate(() => {
      const el = document.getElementById('renderer') as HTMLElement & {
        context?: Record<string, unknown>
      }
      el.context = { _apiBase: '', api: { base: '' }, tenant: { plan: 'free' } }
    })

    await expect(page.getByLabel('Seats')).toBeHidden()
  })

  test('a required field with a defaultValue is valid untouched, and the default ships', async ({
    page,
  }) => {
    await expect(page.getByLabel('Country')).toHaveValue('Benin')

    const verdict = await page.evaluate(async () => {
      const el = document.getElementById('renderer') as HTMLElement & {
        validate: () => Promise<{ valid: boolean }>
      }
      return el.validate()
    })
    expect(verdict.valid).toBe(true)

    const data = JSON.parse(
      (await page.getByTestId('data').textContent()) ?? '{}'
    )
    expect(data.country).toBe('Benin')
  })

  test('context never reaches the emitted data', async ({ page }) => {
    await page.getByLabel('Full name').fill('Ada')

    await expect(page.getByTestId('data')).not.toHaveText('—')
    const data = JSON.parse(
      (await page.getByTestId('data').textContent()) ?? '{}'
    )

    expect(data.fullName).toBe('Ada')
    expect(data).not.toHaveProperty('tenant')
    expect(data).not.toHaveProperty('_apiBase')
    expect(data).not.toHaveProperty('api')
  })
})
