import { expect, test, type Locator, type Page } from '@playwright/test'

const fixedNow = new Date('2026-09-20T12:00:00-07:00')

async function openFixture(
  page: Page,
  viewport: { width: number; height: number },
  query = '__scenario=busy'
) {
  await page.setViewportSize(viewport)
  await page.clock.setFixedTime(fixedNow)
  await page.goto(`/?${query}`)
  await expect(
    page.getByRole('button', { name: /Yoga in the Park/ })
  ).toBeVisible()
}

async function openMobileFilters(page: Page) {
  const disclosure = page.getByRole('button', { name: /Filter events/ })
  await disclosure.click()
  await expect(disclosure).toHaveAttribute('aria-expanded', 'true')
}

async function visibleFilterPopover(page: Page, name: string) {
  const popover = page.getByTestId(`filter-popover-${name}`)
  await expect(popover).toBeVisible()
  return popover
}

async function outline(locator: Locator) {
  return locator.evaluate(element => {
    const style = getComputedStyle(element)
    return {
      style: style.outlineStyle,
      width: Number.parseFloat(style.outlineWidth)
    }
  })
}

async function expectNarrowFilterGeometry(
  page: Page,
  trigger: Locator,
  popover: Locator
) {
  await expect
    .poll(async () => {
      const [box, width] = await Promise.all([
        popover.boundingBox(),
        popover.evaluate(element =>
          Number.parseFloat(getComputedStyle(element).width)
        )
      ])
      return box ? Math.abs(box.width - width) : Number.POSITIVE_INFINITY
    })
    .toBeLessThanOrEqual(0.5)
  const [triggerBox, popoverBox, viewport] = await Promise.all([
    trigger.boundingBox(),
    popover.boundingBox(),
    page.evaluate(() => ({
      width: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth
    }))
  ])
  expect(triggerBox).not.toBeNull()
  expect(popoverBox).not.toBeNull()
  expect(Math.abs(popoverBox!.x - triggerBox!.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(popoverBox!.width - triggerBox!.width)).toBeLessThanOrEqual(1)
  expect(popoverBox!.x).toBeGreaterThanOrEqual(0)
  expect(popoverBox!.x + popoverBox!.width).toBeLessThanOrEqual(viewport.width)
  expect(viewport.documentWidth).toBe(viewport.width)

  const title = popover.locator('[data-part="title"]')
  const close = popover.getByRole('button', { name: /Close .* filters/ })
  const [titleBox, closeBox] = await Promise.all([
    title.boundingBox(),
    close.boundingBox()
  ])
  expect(titleBox).not.toBeNull()
  expect(closeBox).not.toBeNull()
  expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(closeBox!.x)
  expect(closeBox!.width).toBeGreaterThanOrEqual(44)
  expect(closeBox!.height).toBeGreaterThanOrEqual(44)

  const scroll = popover.getByTestId('filter-options-scroll')
  const scrollBox = await scroll.boundingBox()
  expect(scrollBox).not.toBeNull()
  const rows = await popover.getByTestId('filter-checkbox-row').all()
  expect(rows.length).toBeGreaterThan(0)
  for (const row of rows) {
    const [rowBox, controlBox, labelBox] = await Promise.all([
      row.boundingBox(),
      row.locator('[data-part="control"]').boundingBox(),
      row.locator('[data-part="label"]').boundingBox()
    ])
    expect(rowBox).not.toBeNull()
    expect(controlBox).not.toBeNull()
    expect(labelBox).not.toBeNull()
    expect(rowBox!.height).toBeGreaterThanOrEqual(44)
    expect(controlBox!.x + controlBox!.width).toBeLessThanOrEqual(labelBox!.x)
    expect(labelBox!.x + labelBox!.width).toBeLessThanOrEqual(
      scrollBox!.x + scrollBox!.width
    )
  }
}

test.describe('filter popover visual contract', () => {
  test('@webkit-critical keeps the 320px Type popover aligned and focus-safe', async ({
    page
  }) => {
    await openFixture(page, { width: 320, height: 1000 })
    await openMobileFilters(page)
    const trigger = page.getByRole('button', { name: 'Type: All types' })

    await trigger.click()
    const pointerPopover = await visibleFilterPopover(page, 'type')
    await expectNarrowFilterGeometry(page, trigger, pointerPopover)
    const allTypesRow = pointerPopover
      .getByTestId('filter-checkbox-row')
      .filter({ hasText: 'All types' })
    const allTypesControl = allTypesRow.locator('[data-part="control"]')
    expect((await outline(allTypesRow)).style).toBe('none')
    expect((await outline(allTypesControl)).style).toBe('none')
    await expect(page).toHaveScreenshot('type-pointer-320.png')

    await page.keyboard.press('Escape')
    await expect(pointerPopover).toBeHidden()
    await expect(trigger).toBeFocused()

    await trigger.press('Enter')
    const keyboardPopover = await visibleFilterPopover(page, 'type')
    const keyboardAllRow = keyboardPopover
      .getByTestId('filter-checkbox-row')
      .filter({ hasText: 'All types' })
    const keyboardControl = keyboardAllRow.locator('[data-part="control"]')
    expect((await outline(keyboardAllRow)).style).toBe('none')
    const controlOutline = await outline(keyboardControl)
    expect(controlOutline.style).not.toBe('none')
    expect(controlOutline.width).toBeGreaterThanOrEqual(2)
    await expect(page).toHaveScreenshot('type-keyboard-focus-320.png')

    await keyboardPopover
      .getByRole('button', { name: 'Close type filters' })
      .click()
    await expect(keyboardPopover).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  for (const viewport of [
    { width: 390, height: 1000 },
    { width: 320, height: 1000 }
  ]) {
    test(`covers all narrow DTSM filters at ${viewport.width}px`, async ({
      page
    }) => {
      await openFixture(page, viewport)
      await openMobileFilters(page)

      const placesTrigger = page.getByRole('button', {
        name: 'Places: B Street + Central Park'
      })
      await placesTrigger.click()
      const places = await visibleFilterPopover(page, 'places')
      await expectNarrowFilterGeometry(page, placesTrigger, places)
      await expect(page).toHaveScreenshot(`places-${viewport.width}.png`)
      await page.keyboard.press('Escape')

      const typeTrigger = page.getByRole('button', { name: 'Type: All types' })
      await typeTrigger.click()
      const type = await visibleFilterPopover(page, 'type')
      await expectNarrowFilterGeometry(page, typeTrigger, type)
      await type
        .getByTestId('filter-checkbox-row')
        .filter({ hasText: 'Events' })
        .click()
      await expect(page).toHaveScreenshot(`type-selected-${viewport.width}.png`)
      await page.keyboard.press('Escape')

      const organizerTrigger = page.getByRole('button', {
        name: 'Organizer: All organizers'
      })
      await organizerTrigger.click()
      const organizer = await visibleFilterPopover(page, 'organizer')
      await expectNarrowFilterGeometry(page, organizerTrigger, organizer)
      await organizer
        .getByRole('textbox', { name: 'Search organizers' })
        .fill('city')
      await expect(
        organizer.getByRole('checkbox', { name: 'City of San Mateo' })
      ).toBeVisible()
      await expect(page).toHaveScreenshot(
        `organizer-search-${viewport.width}.png`
      )
    })
  }

  test('covers desktop menus, filter popovers, and overflow detail', async ({
    page
  }) => {
    await openFixture(page, { width: 1280, height: 900 })

    const calendarMenu = page.getByRole('button', {
      name: 'Downtown San Mateo events'
    })
    await calendarMenu.click()
    await expect(page).toHaveScreenshot('desktop-calendar-menu.png')
    await page.keyboard.press('Escape')

    const addMenu = page.getByRole('button', { name: 'Add to calendar' })
    await addMenu.click()
    await expect(page).toHaveScreenshot('desktop-add-menu.png')
    await page.keyboard.press('Escape')

    const placesTrigger = page.getByRole('button', {
      name: 'Places: B Street + Central Park'
    })
    await placesTrigger.click()
    await expect(page).toHaveScreenshot('desktop-places.png')
    await page.keyboard.press('Escape')

    const typeTrigger = page.getByRole('button', { name: 'Type: All types' })
    await typeTrigger.click()
    await expect(page).toHaveScreenshot('desktop-type.png')
    await page.keyboard.press('Escape')

    const organizerTrigger = page.getByRole('button', {
      name: 'Organizer: All organizers'
    })
    await organizerTrigger.click()
    await expect(page).toHaveScreenshot('desktop-organizer.png')
    await page.keyboard.press('Escape')

    await page.getByRole('button', { name: '+1 more' }).click()
    await expect(page).toHaveScreenshot('desktop-overflow.png')
    await page.getByRole('button', { name: /Second Saturday Market/ }).click()
    await expect(page).toHaveScreenshot('desktop-overflow-detail.png')
  })

  test('covers narrow List event disclosure', async ({ page }) => {
    await openFixture(page, { width: 390, height: 1000 })
    await page.getByRole('tab', { name: 'List' }).click()
    await page.getByRole('button', { name: /Yoga in the Park/ }).click()
    await expect(page).toHaveScreenshot('mobile-list-detail-390.png')
  })

  test('@deployed verifies the live 320px Type geometry', async ({ page }) => {
    test.skip(!process.env.DEPLOYED_FRONTEND_URL)
    await page.setViewportSize({ width: 320, height: 1000 })
    await page.goto('/')
    await openMobileFilters(page)
    const trigger = page.getByRole('button', { name: 'Type: All types' })
    await trigger.click()
    const popover = await visibleFilterPopover(page, 'type')
    await expectNarrowFilterGeometry(page, trigger, popover)
    const allTypesRow = popover
      .getByTestId('filter-checkbox-row')
      .filter({ hasText: 'All types' })
    expect((await outline(allTypesRow)).style).toBe('none')
  })
})
