import { test, expect } from '@playwright/test'

test('dragging a palette brick onto the empty canvas creates a field', async ({ page }) => {
  await page.goto('/playground')

  const builder = page.locator('fk-form-builder')
  await expect(builder).toBeVisible()

  const emptyZone = builder.locator('.fk-drop__empty')
  await expect(emptyZone).toBeVisible()

  const mold = builder.locator('fk-brick-mold-item', { hasText: 'Text' }).first()
  await mold.dragTo(emptyZone)

  await expect(emptyZone).toHaveCount(0)
  await expect(builder.locator('input').first()).toBeVisible()
})
