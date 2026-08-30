import { test, expect } from '@playwright/test'

const FIXTURES = `http://${process.env.E2E_HOST ?? 'localhost'}:4182`

// FormKrafter themed with GOV.UK Frontend tokens. The point of the test is that
// the mapping is only custom properties and class-name styling — no brick is
// overridden, no component is forked — so a government design system can adopt
// the renderer without changing the library.
test.describe('themed as a government design system', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FIXTURES}/govuk-theme.html`)
    await expect(page.getByLabel('Full name')).toBeVisible()
  })

  test('the design system tokens reach the rendered controls', async ({
    page,
  }) => {
    const input = page.getByLabel('Full name')

    // GOV.UK: 2px solid black border, square corners.
    await expect(input).toHaveCSS('border-top-width', '2px')
    await expect(input).toHaveCSS('border-top-color', 'rgb(11, 12, 12)')
    await expect(input).toHaveCSS('border-top-left-radius', '0px')
  })

  test('the focus state is the design system yellow, not the default', async ({
    page,
  }) => {
    const input = page.getByLabel('Full name')
    await input.focus()

    await expect(input).toHaveCSS('outline-color', 'rgb(255, 221, 0)')
    await expect(input).toHaveCSS('outline-width', '3px')
  })

  test('the form still validates and submits under the theme', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Submit' }).click()
    await expect(page.getByRole('alert').first()).toBeVisible()

    await page.getByLabel('Full name').fill('Ada Lovelace')
    await page.getByLabel('Email address').fill('ada@example.gov.uk')
    await page.getByRole('combobox', { name: 'Where do you live?' }).click()
    await page.getByRole('option', { name: 'Wales' }).click()

    const verdict = await page.evaluate(async () => {
      const el = document.getElementById('renderer') as HTMLElement & {
        validate: () => Promise<{ valid: boolean }>
      }
      return el.validate()
    })

    expect(verdict.valid).toBe(true)
  })

  test('accessibility survives the theme', async ({ page }) => {
    await expect(page.getByLabel('Full name')).toHaveAttribute(
      'aria-required',
      'true'
    )
    await expect(page.locator('.fk-field__required').first()).toBeVisible()
  })
})
