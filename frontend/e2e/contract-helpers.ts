import { expect, type Locator, type Page } from '@playwright/test'

export async function selectCalendarRepresentation(
  page: Page,
  view: 'Grid' | 'List'
) {
  const tab = page.getByRole('tab', { name: view })
  await tab.click()
  await expect(tab).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('[role="tabpanel"]')).toHaveCount(1)
  const panel = page.getByRole('tabpanel', { name: view })
  await expect(panel).toBeVisible()
  return panel
}

export async function openMenuAndFocus(page: Page, trigger: Locator) {
  await trigger.click()
  const menu = page
    .locator('[data-scope="menu"][data-part="content"]:visible')
    .last()
  await expect(menu).toBeVisible()
  await expect(menu).toHaveAttribute('data-state', 'open')
  await expect(menu.locator('[data-part="item"]').first()).toBeVisible()
  await expect
    .poll(() =>
      menu.evaluate(element => element.contains(document.activeElement))
    )
    .toBe(true)
  return menu
}

export async function closeMenuAndRestoreFocus(
  page: Page,
  trigger: Locator,
  menu: Locator
) {
  await page.keyboard.press('Escape')
  await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  await expect(menu).toBeHidden()
  await expect(trigger).toBeFocused()
}
