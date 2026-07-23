import { test, expect } from '@playwright/test'

test('home page renders the examples catalog', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'FormKrafter examples' })).toBeVisible()
  await expect(page.getByRole('link', { name: /wizard/i }).first()).toBeVisible()
})

test('locale switcher translates the chrome without navigation', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'FormKrafter examples' })).toBeVisible()

  await page.getByRole('button', { name: 'FR', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Exemples FormKrafter' })).toBeVisible()
  expect(new URL(page.url()).pathname).toBe('/')

  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'FormKrafter examples' })).toBeVisible()
})
