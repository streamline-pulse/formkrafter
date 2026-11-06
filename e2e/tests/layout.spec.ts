import { test, expect, type Page } from '@playwright/test'

const FIXTURES = `http://${process.env.E2E_HOST ?? 'localhost'}:4182`

type Box = { x: number; y: number; width: number; height: number }

const box = async (page: Page, selector: string): Promise<Box> => {
  const found = await page.locator(selector).first().boundingBox()
  if (!found) throw new Error(`${selector} has no box`)
  return found
}

// The text brick names its input after the key; a label locator is sturdier.
const control = (page: Page, form: string, label: string) =>
  page.locator(`#${form}`).getByLabel(label, { exact: true })

const controlBox = async (page: Page, form: string, label: string): Promise<Box> => {
  const found = await control(page, form, label).boundingBox()
  if (!found) throw new Error(`${label} has no box`)
  return found
}

test.describe('layout of rows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FIXTURES}/layout.html`)
    await expect(control(page, 'hidden-middle', 'First')).toBeVisible()
  })

  test('a field hidden by a rule leaves no column: the others share the row', async ({ page }) => {
    await expect(page.locator('#hidden-middle').getByText('Second')).toHaveCount(0)
    const row = await box(page, '#hidden-middle .fk-row')
    const first = await controlBox(page, 'hidden-middle', 'First')
    const third = await controlBox(page, 'hidden-middle', 'Third')

    const gap = 8
    expect(first.width).toBeCloseTo((row.width - gap) / 2, 0)
    expect(third.width).toBeCloseTo((row.width - gap) / 2, 0)
    expect(third.x + third.width).toBeCloseTo(row.x + row.width, 0)
  })

  test('a hidden first field does not push the next one to the right', async ({ page }) => {
    const row = await box(page, '#hidden-first .fk-row')
    await expect(control(page, 'hidden-first', 'Is it a wholesale purchase?')).toBeVisible()
    const wholesale = await box(page, '#hidden-first .fk-field--check')
    expect(wholesale.x).toBeCloseTo(row.x, 0)
    expect(wholesale.width).toBeCloseTo(row.width, 0)
  })

  test('a field shown again by a rule takes its column back', async ({ page }) => {
    await control(page, 'hidden-middle', 'Mode').fill('services')
    await expect(control(page, 'hidden-middle', 'Second')).toBeVisible()
    const row = await box(page, '#hidden-middle .fk-row')
    const first = await controlBox(page, 'hidden-middle', 'First')
    expect(first.width).toBeCloseTo((row.width - 16) / 3, 0)
  })

  test('hidden bricks add no gap to their group', async ({ page }) => {
    const before = await box(page, '#hidden-gaps fk-brick-render:has(> .fk-field) >> nth=1')
    const after = await box(page, '#hidden-gaps fk-brick-render:has(> .fk-field) >> nth=2')
    expect(after.y - (before.y + before.height)).toBeCloseTo(8, 0)
  })

  test('labels on two lines and a hint under one field move no control', async ({ page }) => {
    const tops = await page
      .locator('#aligned .fk-row input.fk-field__input')
      .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)))
    expect(tops).toHaveLength(3)
    expect(new Set(tops).size).toBe(1)
  })

  test('a checkbox in a row sits on the line of its neighbours’ controls', async ({ page }) => {
    const date = await controlBox(page, 'aligned', 'Date')
    const majored = await controlBox(page, 'aligned', 'Higher rate')
    expect(majored.y + majored.height / 2).toBeCloseTo(date.y + date.height / 2, 0)
  })

  test('layout.columns keeps a lone field to its share; layout.span widens one', async ({ page }) => {
    const rows = page.locator('#columns .fk-row')
    const half = (await rows.nth(0).boundingBox())!
    const alone = await controlBox(page, 'columns', 'Where is the supplier established?')
    expect(alone.width).toBeCloseTo((half.width - 8) / 2, 0)

    const thirds = (await rows.nth(1).boundingBox())!
    const wide = await controlBox(page, 'columns', 'Spans two')
    const narrow = await controlBox(page, 'columns', 'One')
    const column = (thirds.width - 16) / 3
    expect(wide.width).toBeCloseTo(column * 2 + 8, 0)
    expect(narrow.width).toBeCloseTo(column, 0)
  })

  test('a long select value takes two lines at most and shows the whole label on hover', async ({ page }) => {
    const value = page.locator('#long-select .fk-select__value')
    await expect(value).toHaveAttribute('title', /commission agent$/)
    // Two lines at a normal line height are about 2.4em; three would be 3.6em.
    const fontSize = await value.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))
    expect((await value.boundingBox())!.height).toBeLessThanOrEqual(fontSize * 2.6)
  })

  test('data-grid cells keep regular columns and aligned controls', async ({ page }) => {
    const cells = page.locator('#grid .fk-grid__cells > fk-brick-render')
    const widths = await cells.evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().width)))
    expect(new Set(widths).size).toBe(1)

    const inputs = page.locator('#grid .fk-grid__cells input')
    const firstLine = await inputs.evaluateAll((els) => {
      const top = els[0].getBoundingClientRect().top
      return els.filter((el) => Math.abs(el.getBoundingClientRect().top - top) < 40).map((el) => Math.round(el.getBoundingClientRect().top))
    })
    expect(firstLine.length).toBeGreaterThan(1)
    expect(new Set(firstLine).size).toBe(1)
  })

  test('the required mark follows the theme’s danger colour', async ({ page }) => {
    const color = await page
      .locator('#dark .fk-field__required')
      .evaluate((el) => getComputedStyle(el).color)
    expect(color).toBe('rgb(248, 113, 113)')
  })
})

test.describe('checkbox', () => {
  test('shows its hint under the label text and marks a required box', async ({ page }) => {
    await page.goto(`${FIXTURES}/layout.html`)
    const field = page.locator('#checkbox .fk-field--check')
    await expect(field.locator('.fk-field__hint')).toHaveText('Tick when the invoice shows VAT (LPF art. 102).')
    await expect(field.locator('.fk-field__required')).toHaveCount(1)

    const label = await box(page, '#checkbox .fk-field--check .fk-field__label')
    const hint = await box(page, '#checkbox .fk-field--check .fk-field__hint')
    expect(hint.x).toBeCloseTo(label.x, 0)
    await expect(page.getByRole('checkbox', { name: /The supplier charges VAT/ })).toBeVisible()
  })
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test('rows stack one field per line and the page does not scroll sideways', async ({ page }) => {
    await page.goto(`${FIXTURES}/layout.html`)
    await expect(control(page, 'wide-row', 'Customs office')).toBeVisible()

    const row = await box(page, '#wide-row .fk-row')
    const xs = await Promise.all(
      ['Customs office', 'Declaration date', 'Customs regime', 'Transport mode'].map(async (label) => {
        const found = await controlBox(page, 'wide-row', label)
        expect(found.width).toBeCloseTo(row.width, 0)
        return Math.round(found.x)
      })
    )
    expect(new Set(xs).size).toBe(1)

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })

  test('a span wider than the stacked row does not overflow it', async ({ page }) => {
    await page.goto(`${FIXTURES}/layout.html`)
    const row = await box(page, '#columns .fk-row >> nth=1')
    const wide = await controlBox(page, 'columns', 'Spans two')
    expect(wide.width).toBeCloseTo(row.width, 0)
  })
})
