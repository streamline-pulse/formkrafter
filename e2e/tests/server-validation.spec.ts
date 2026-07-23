import { test, expect } from '@playwright/test'

test('server function revalidates the payload and returns a verdict', async ({ page }) => {
  await page.goto('/examples/server-validation')

  await page.getByRole('button', { name: 'Submit & revalidate on server' }).click()

  const serverBlock = page
    .locator('section', { has: page.getByRole('heading', { name: 'Server verdict' }) })
    .locator('pre')
  await expect(serverBlock).toContainText('"valid": false')
  await expect(serverBlock).toContainText('required')
})
