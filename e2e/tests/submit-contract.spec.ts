import { test, expect } from '@playwright/test'

const FIXTURES = `http://${process.env.E2E_HOST ?? 'localhost'}:4182`

test.describe('formSubmit contract', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FIXTURES}/submit-contract.html`)
    await expect(page.getByLabel('Full name')).toBeVisible()
  })

  test('an invalid form never emits formSubmit', async ({ page }) => {
    await page.getByRole('button', { name: 'Next →' }).click()
    await page.getByRole('button', { name: 'Submit' }).click()

    await expect(page.getByTestId('payload')).toHaveText('—')
    await expect(page.getByTestId('submits')).toHaveText('0')
  })

  test('a valid form emits formSubmit once, reporting itself valid', async ({
    page,
  }) => {
    await page.getByLabel('Full name').fill('Ada Lovelace')
    await page.getByRole('button', { name: 'Next →' }).click()
    await page.getByRole('button', { name: 'Submit' }).click()

    await expect(page.getByTestId('submits')).toHaveText('1')

    const payload = JSON.parse(
      (await page.getByTestId('payload').textContent()) ?? '{}'
    )
    expect(payload.isValid).toBe(true)
    expect(payload.errors).toEqual({})
    expect(payload.data).toEqual({ fullName: 'Ada Lovelace' })
  })
})
