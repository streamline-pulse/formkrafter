import { test, expect } from '@playwright/test'

const FIXTURES = `http://${process.env.E2E_HOST ?? 'localhost'}:4182`

test.describe('right-to-left', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${FIXTURES}/rtl.html`)
    await expect(page.getByLabel('الاسم الكامل')).toBeVisible()
  })

  test('the document direction reaches the rendered controls', async ({
    page,
  }) => {
    const directions = await page.evaluate(() =>
      Array.from(document.querySelectorAll('fk-form-render input, fk-form-render textarea'))
        .map((el) => getComputedStyle(el).direction)
    )

    expect(directions.length).toBeGreaterThan(0)
    expect(new Set(directions)).toEqual(new Set(['rtl']))
  })

  test('no control overflows to the left of its container', async ({ page }) => {
    const overflow = await page.evaluate(() => {
      const form = document.querySelector('fk-form-render') as HTMLElement
      const box = form.getBoundingClientRect()
      return Array.from(form.querySelectorAll('input, textarea, select, button'))
        .filter((el) => {
          const r = el.getBoundingClientRect()
          return r.left < box.left - 1 || r.right > box.right + 1
        })
        .map((el) => el.tagName.toLowerCase())
    })

    expect(overflow).toEqual([])
  })

  test('the required marker sits after the label, not before it', async ({
    page,
  }) => {
    const ordered = await page.evaluate(() => {
      const marker = document.querySelector('.fk-field__required')
      if (!marker) return null
      const label = marker.parentElement as HTMLElement
      // In RTL "after" means visually to the left, so compare in logical order
      // by walking the DOM rather than by coordinates.
      return Array.from(label.childNodes).indexOf(marker) > 0
    })

    expect(ordered).toBe(true)
  })

  test('the layout mirrors: every field sits the same distance from the start edge', async ({
    page,
  }) => {
    const offsets = async (dir: 'ltr' | 'rtl') => {
      await page.goto(`${FIXTURES}/rtl.html?dir=${dir}`)
      await expect(page.getByLabel('الاسم الكامل')).toBeVisible()

      return page.evaluate((direction) => {
        const form = document.querySelector('fk-form-render') as HTMLElement
        const box = form.getBoundingClientRect()
        return Array.from(form.querySelectorAll('input, textarea'))
          .map((el) => {
            const r = el.getBoundingClientRect()
            // Distance from the *start* edge, which is the right one in RTL.
            return Math.round(direction === 'rtl' ? box.right - r.right : r.left - box.left)
          })
      }, dir)
    }

    const ltr = await offsets('ltr')
    const rtl = await offsets('rtl')

    expect(rtl).toEqual(ltr)
  })

  test('the grid renders its rows without horizontal overflow', async ({
    page,
  }) => {
    const grid = page.locator('fk-data-grid')
    await expect(grid).toBeVisible()

    const overflow = await grid.evaluate(
      (el) => Math.round(el.scrollWidth - el.clientWidth)
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
