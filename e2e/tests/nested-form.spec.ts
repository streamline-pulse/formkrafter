import { test, expect } from '@playwright/test'

test('nested-form bricks are expanded through the spec source service', async ({ page }) => {
  await page.goto('/examples/nested-form')

  await expect(page.getByLabel('Street')).toBeVisible()
  await expect(page.getByLabel('Full name')).toBeVisible()

  await expect(page.getByRole('group', { name: 'Delivery address' })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Emergency contact' })).toBeVisible()
})
