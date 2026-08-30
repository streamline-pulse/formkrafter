import { test, expect } from '@playwright/test'

// 360 x 640 is the small end of the phones that are the primary — often only —
// access device for a public service.
const PHONE = { width: 360, height: 640 }

// The renderer is what a citizen meets on a phone, so it is what is measured
// here. The builder is a desktop authoring tool — palette, canvas and property
// panel side by side — and is deliberately out of scope; the conformance note
// says so rather than pretending otherwise.
const PAGES = [
  { name: 'tanstack wizard', url: 'http://localhost:4179/examples/wizard' },
  { name: 'vue example', url: 'http://localhost:4180/' },
  { name: 'plain html example', url: 'http://localhost:4181/' },
]

test.use({ viewport: PHONE })

for (const { name, url } of PAGES) {
  test.describe(name, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(url)
      await page.waitForSelector('input, textarea, select', { timeout: 15000 })
    })

    // The host page's own chrome is the host's business; what is measured here
    // is the form FormKrafter renders inside whatever width it is given.
    test('the rendered form does not overflow its container', async ({ page }) => {
      const overflow = await page.evaluate(() => {
        const form = document.querySelector('fk-form-render')
        if (!form) return 0
        return Math.round(form.scrollWidth - form.clientWidth)
      })
      expect(overflow).toBeLessThanOrEqual(0)
    })

    test('no control is wider than the viewport', async ({ page }) => {
      const tooWide = await page.evaluate((width) => {
        const root = document.querySelector('fk-form-render') ?? document
        return Array.from(root.querySelectorAll('input, textarea, select, button'))
          .filter((el) => el.getBoundingClientRect().width > width)
          .map((el) => el.tagName.toLowerCase())
      }, PHONE.width)

      expect(tooWide).toEqual([])
    })

    test('interactive controls are large enough to tap', async ({ page }) => {
      // WCAG 2.2 target size (minimum) is 24 x 24 CSS pixels. Elements that are
      // hidden, or inline within a sentence, are exempt and filtered out here.
      const tooSmall = await page.evaluate(() => {
        const root = document.querySelector('fk-form-render') ?? document
        return Array.from(
          root.querySelectorAll('button, [role="button"], input:not([type=hidden])')
        )
          .filter((el) => {
            const box = el.getBoundingClientRect()
            if (box.width === 0 || box.height === 0) return false
            return box.height < 24 || box.width < 24
          })
          .map((el) => {
            const box = el.getBoundingClientRect()
            return `${el.tagName.toLowerCase()} ${Math.round(box.width)}x${Math.round(box.height)}`
          })
      })

      expect(tooSmall).toEqual([])
    })
  })
}
