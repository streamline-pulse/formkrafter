import { test, expect } from '@playwright/test'

test('select combobox is fully keyboard operable', async ({ page }) => {
  await page.goto('/examples/multilingual')

  const combobox = page.getByRole('combobox').first()
  await expect(combobox).toBeVisible()

  await combobox.focus()
  await combobox.press('Enter')
  await expect(combobox).toHaveAttribute('aria-expanded', 'true')

  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')

  await expect(combobox).toHaveAttribute('aria-expanded', 'false')
  await expect(combobox).toContainText('Designer')
})

test('escape closes the listbox and returns focus to the trigger', async ({ page }) => {
  await page.goto('/examples/multilingual')

  const combobox = page.getByRole('combobox').first()
  await combobox.focus()
  await combobox.press('Enter')
  await expect(combobox).toHaveAttribute('aria-expanded', 'true')

  await page.keyboard.press('Escape')
  await expect(combobox).toHaveAttribute('aria-expanded', 'false')
  await expect(combobox).toBeFocused()
})
