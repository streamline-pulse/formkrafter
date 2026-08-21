import { test, expect } from '@playwright/test'

const FIXTURES = `http://${process.env.E2E_HOST ?? 'localhost'}:4182`

test.describe('read-only review of a submission', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FIXTURES}/readonly-review.html`)
    await expect(page.getByLabel('Full name')).toBeVisible()
  })

  test('values are visible but frozen', async ({ page }) => {
    const name = page.getByLabel('Full name')
    await expect(name).toHaveValue('Ada Lovelace')
    await expect(name).toHaveJSProperty('readOnly', true)
    await expect(name).toHaveAttribute('aria-readonly', 'true')
  })

  test('every step stays navigable despite the validation gate', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Next →' }).click()
    await expect(page.getByLabel('City')).toHaveValue('Cotonou')

    await page.getByRole('button', { name: '← Back' }).click()
    await expect(page.getByLabel('Full name')).toBeVisible()
  })

  test('a completed submission can jump straight to a later step', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'City' }).click()
    await expect(page.getByLabel('City')).toBeVisible()
  })

  test('nothing can be submitted', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Submit' })).toHaveCount(0)
    await expect(page.getByTestId('submits')).toHaveText('0')
  })
})
