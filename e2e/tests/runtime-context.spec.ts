import { test, expect } from '@playwright/test'

const FIXTURES = `http://${process.env.E2E_HOST ?? 'localhost'}:4182`

test.describe('runtime context', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FIXTURES}/runtime-context.html`)
    await expect(page.getByLabel('Full name')).toBeVisible()
  })

  test('context feeds remote option interpolation', async ({ page }) => {
    await page.getByRole('combobox', { name: 'City' }).click()
    await expect(page.getByRole('option', { name: 'Porto-Novo' })).toBeVisible()
  })

  test('context feeds visibility rules', async ({ page }) => {
    await expect(page.getByLabel('Seats')).toBeVisible()

    await page.evaluate(() => {
      const el = document.getElementById('renderer') as HTMLElement & {
        context?: Record<string, unknown>
      }
      el.context = { _apiBase: '', tenant: { plan: 'free' } }
    })

    await expect(page.getByLabel('Seats')).toBeHidden()
  })

  test('context never reaches the emitted data', async ({ page }) => {
    await page.getByLabel('Full name').fill('Ada')

    await expect(page.getByTestId('data')).not.toHaveText('—')
    const data = JSON.parse(
      (await page.getByTestId('data').textContent()) ?? '{}'
    )

    expect(data).toEqual({ fullName: 'Ada' })
    expect(data).not.toHaveProperty('tenant')
    expect(data).not.toHaveProperty('_apiBase')
  })
})
