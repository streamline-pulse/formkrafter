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
    await expect(field).toHaveJSProperty('readOnly', true)

    await field.focus()
    await page.keyboard.type('MODIFIE-TEST')
    await expect(field).toHaveValue('{{S6$demandeAcceptable}}')
  })

  test('a collection nested in a collection is covered too', async ({ page }) => {
    const deep = page.getByLabel('Deep')
    await expect(deep).toHaveValue('buried')
    await expect(deep).toHaveJSProperty('readOnly', true)
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
    await expect(page.getByLabel('Name')).toHaveJSProperty('readOnly', false)
  })
})

test.describe('readOnly semantics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FIXTURES}/readonly-collection.html`)
    await expect(page.getByLabel('Name')).toBeVisible()
  })

  test('text controls carry readonly, not disabled', async ({ page }) => {
    for (const label of ['Name', 'Body']) {
      const field = page.getByLabel(label)
      await expect(field).toHaveJSProperty('readOnly', true)
      await expect(field).toHaveAttribute('aria-readonly', 'true')
      await expect(field).toBeEnabled()
    }
  })

  test('their value can be selected and copied', async ({ page }) => {
    const selected = await page.evaluate(() => {
      const input = document.querySelector(
        'input[readonly]'
      ) as HTMLInputElement
      input.select()
      return input.value.slice(input.selectionStart ?? 0, input.selectionEnd ?? 0)
    })
    expect(selected).toBe('Tri (RH)')
  })

  test('they stay reachable by keyboard', async ({ page }) => {
    await page.getByLabel('Name').focus()
    await expect(page.getByLabel('Name')).toBeFocused()
  })

  test('typing still changes nothing', async ({ page }) => {
    const field = page.getByLabel('Name')
    await field.focus()
    await page.keyboard.type('XXX')
    await expect(field).toHaveValue('Tri (RH)')
  })

  test('controls without a readonly attribute stay disabled but announce readonly', async ({
    page,
  }) => {
    const grid = page.locator('fk-data-grid button')
    expect(
      await grid.evaluateAll((els) =>
        els.filter((b) => !(b as HTMLButtonElement).disabled).length
      )
    ).toBe(0)

    const locked = await page.evaluate(() =>
      Array.from(document.querySelectorAll('input[type=checkbox], select')).map(
        (el) => ({
          disabled: (el as HTMLInputElement).disabled,
          aria: el.getAttribute('aria-readonly'),
        })
      )
    )
    expect(locked.length).toBeGreaterThan(0)
    for (const l of locked) {
      expect(l.disabled).toBe(true)
      expect(l.aria).toBe('true')
    }
  })
})

test('submitting programmatically stays neutralised in readOnly', async ({
  page,
}) => {
  await page.goto(`${FIXTURES}/readonly-collection.html`)
  await expect(page.getByLabel('Name')).toBeVisible()

  const fired = await page.evaluate(async () => {
    const el = document.getElementById('renderer') as HTMLElement & {
      submit: () => Promise<unknown>
    }
    let seen = 0
    el.addEventListener('formSubmit', () => (seen += 1))
    await el.submit()
    return seen
  })

  expect(fired).toBe(0)
})
