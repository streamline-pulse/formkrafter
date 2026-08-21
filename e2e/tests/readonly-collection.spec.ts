import { test, expect } from '@playwright/test'

const FIXTURES = `http://${process.env.E2E_HOST ?? 'localhost'}:4182`

test.describe('readOnly inside collections', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FIXTURES}/readonly-collection.html`)
    await expect(page.getByLabel('Name')).toBeVisible()
  })

  test('every control is locked, however deep the collections go', async ({
    page,
  }) => {
    const editable = await page.evaluate(() =>
      Array.from(document.querySelectorAll('input, textarea, select'))
        .filter((el) => {
          const control = el as HTMLInputElement
          return !control.disabled && !control.readOnly
        })
        .map((el) => (el as HTMLInputElement).name || el.getAttribute('placeholder') || el.tagName)
    )

    expect(editable).toEqual([])
  })

  test('a collection field cannot be written to', async ({ page }) => {
    const field = page.getByLabel('Left operand')
    await expect(field).toHaveValue('{{S6$demandeAcceptable}}')
    await expect(field).toBeDisabled()

    await expect(field.fill('MODIFIE-TEST', { timeout: 1500 })).rejects.toThrow()
    await expect(field).toHaveValue('{{S6$demandeAcceptable}}')
  })

  test('a collection nested in a collection is covered too', async ({ page }) => {
    const deep = page.getByLabel('Deep')
    await expect(deep).toHaveValue('buried')
    await expect(deep).toBeDisabled()
  })

  test('every row control stays inactive', async ({ page }) => {
    const active = await page.evaluate(() =>
      Array.from(document.querySelectorAll('fk-data-grid button')).filter(
        (b) => !(b as HTMLButtonElement).disabled
      ).length
    )
    expect(active).toBe(0)
  })
})

test.describe('disabled is an equivalent of readOnly', () => {
  test('the disabled prop locks the whole tree the same way', async ({
    page,
  }) => {
    await page.goto(`${FIXTURES}/readonly-collection.html`)
    await expect(page.getByLabel('Name')).toBeVisible()

    await page.evaluate(() => {
      const el = document.getElementById('renderer') as HTMLElement & {
        readOnly?: boolean
        disabled?: boolean
      }
      el.readOnly = false
      el.disabled = true
    })

    await expect(page.getByLabel('Name')).toBeDisabled()
    await expect(page.getByLabel('Left operand')).toBeDisabled()
    await expect(page.getByLabel('Deep')).toBeDisabled()
  })
})
