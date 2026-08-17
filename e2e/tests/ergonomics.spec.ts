import { test, expect } from '@playwright/test'

const FIXTURES = `http://${process.env.E2E_HOST ?? 'localhost'}:4182`

test.describe('renderer ergonomics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FIXTURES}/ergonomics.html`)
    await expect(page.getByLabel('Full name')).toBeVisible()
  })

  test('validityChange fires on initial render, before any interaction', async ({
    page,
  }) => {
    await expect(page.getByTestId('validity-count')).not.toHaveText('0')
    const detail = JSON.parse(
      (await page.getByTestId('validity').textContent()) ?? '{}'
    )
    expect(detail.valid).toBe(false)
    expect(detail.errors).toHaveProperty('fullName')
  })

  test('a host button follows validity with no ref and no validate() call', async ({
    page,
  }) => {
    const external = page.getByTestId('external')
    await expect(external).toBeDisabled()

    await page.getByLabel('Full name').fill('Ada')
    await expect(external).toBeEnabled()

    await page.getByLabel('Full name').fill('')
    await expect(external).toBeDisabled()
  })

  test('submit() emits formSubmit only once the form is valid', async ({
    page,
  }) => {
    await page.evaluate(() =>
      (
        document.getElementById('renderer') as HTMLElement & {
          submit: () => Promise<unknown>
        }
      ).submit()
    )
    await expect(page.getByTestId('submits')).toHaveText('0')

    await page.getByLabel('Full name').fill('Ada')
    await page.evaluate(() =>
      (
        document.getElementById('renderer') as HTMLElement & {
          submit: () => Promise<unknown>
        }
      ).submit()
    )
    await expect(page.getByTestId('submits')).toHaveText('1')
  })

  test('showSubmit renders a working built-in button', async ({ page }) => {
    await page.getByLabel('Full name').fill('Ada')
    await page.getByRole('button', { name: 'Submit' }).click()
    await expect(page.getByTestId('submits')).toHaveText('1')
  })

  test('a required field is marked visually and for assistive tech', async ({
    page,
  }) => {
    await expect(page.getByLabel('Full name')).toHaveAttribute(
      'aria-required',
      'true'
    )
    await expect(page.getByLabel('Nickname')).not.toHaveAttribute(
      'aria-required',
      'true'
    )
    await expect(page.locator('.fk-field__required').first()).toBeVisible()
  })

  test('readOnly disables every control', async ({ page }) => {
    await page.evaluate(() => {
      const el = document.getElementById('renderer') as HTMLElement & {
        readOnly?: boolean
      }
      el.readOnly = true
    })

    await expect(page.getByLabel('Full name')).toBeDisabled()
    await expect(page.getByLabel('Nickname')).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Submit' })).toHaveCount(0)
  })
})
