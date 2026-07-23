import { test, expect } from '@playwright/test'

test('wizard blocks invalid steps then advances', async ({ page }) => {
  await page.goto('/examples/wizard')

  const nameInput = page.getByLabel('Full name')
  await expect(nameInput).toBeVisible()

  await page.getByRole('button', { name: 'Next →' }).click()
  await expect(page.getByRole('alert').first()).toBeVisible()
  await expect(nameInput).toBeVisible()

  await nameInput.fill('Ada Lovelace')
  await page.getByLabel('Email').fill('ada@example.com')
  await page.getByRole('button', { name: 'Next →' }).click()

  await expect(page.getByLabel('City')).toBeVisible()
  await expect(nameInput).toBeHidden()
})
