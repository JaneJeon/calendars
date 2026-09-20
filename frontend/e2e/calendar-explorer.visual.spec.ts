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

async function normalizePageForPointerScreenshot(page: Page) {
  await page.mouse.move(0, 0)
  await page.evaluate(() => {
    window.scrollTo(0, 0)
    for (const element of document.querySelectorAll<HTMLElement>(
      '[data-testid="filter-options-scroll"]'
    ))
      element.scrollTop = 0
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
      height: window.innerHeight,
      documentWidth: document.documentElement.scrollWidth
    }))
  ])
  expect(triggerBox).not.toBeNull()
  expect(popoverBox).not.toBeNull()
  expect(Math.abs(popoverBox!.x - triggerBox!.x)).toBeLessThanOrEqual(1)
  expect(Math.abs(popoverBox!.width - triggerBox!.width)).toBeLessThanOrEqual(1)
  expect(popoverBox!.x).toBeGreaterThanOrEqual(0)
  expect(popoverBox!.y).toBeGreaterThanOrEqual(0)
  expect(popoverBox!.x + popoverBox!.width).toBeLessThanOrEqual(viewport.width)
  expect(popoverBox!.y + popoverBox!.height).toBeLessThanOrEqual(
    viewport.height
  )
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
  expect(titleBox!.y).toBeGreaterThanOrEqual(popoverBox!.y)
  expect(closeBox!.y).toBeGreaterThanOrEqual(popoverBox!.y)
  expect(closeBox!.y + closeBox!.height).toBeLessThanOrEqual(
    popoverBox!.y + popoverBox!.height
  )
  expect(closeBox!.width).toBeGreaterThanOrEqual(43.5)
  expect(closeBox!.height).toBeGreaterThanOrEqual(43.5)

  const scroll = popover.getByTestId('filter-options-scroll')
  const scrollBox = await scroll.boundingBox()
  expect(scrollBox).not.toBeNull()
  expect(scrollBox!.y).toBeGreaterThanOrEqual(
    Math.max(titleBox!.y + titleBox!.height, closeBox!.y + closeBox!.height)
  )
  expect(scrollBox!.y + scrollBox!.height).toBeLessThanOrEqual(
    popoverBox!.y + popoverBox!.height
  )
  const search = popover.getByRole('textbox')
  if ((await search.count()) > 0) {
    const searchBox = await search.boundingBox()
    expect(searchBox).not.toBeNull()
    expect(searchBox!.y).toBeGreaterThanOrEqual(titleBox!.y + titleBox!.height)
    expect(searchBox!.y + searchBox!.height).toBeLessThanOrEqual(scrollBox!.y)
  }
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
    expect(controlBox!.y).toBeGreaterThanOrEqual(rowBox!.y)
    expect(controlBox!.y + controlBox!.height).toBeLessThanOrEqual(
      rowBox!.y + rowBox!.height
    )
    expect(labelBox!.y).toBeGreaterThanOrEqual(rowBox!.y)
    expect(labelBox!.y + labelBox!.height).toBeLessThanOrEqual(
      rowBox!.y + rowBox!.height
    )
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
      await places
        .getByRole('textbox', { name: 'Search places' })
        .fill('sutter')
      await expect(
        places.getByRole('checkbox', {
          name: 'Sutter Medical Center San Mateo'
        })
      ).toBeVisible()
      await normalizePageForPointerScreenshot(page)
      await expect(page).toHaveScreenshot(`places-search-${viewport.width}.png`)
      await page.keyboard.press('Escape')

      await placesTrigger.click()
      const partialPlaces = await visibleFilterPopover(page, 'places')
      await partialPlaces
        .getByTestId('filter-checkbox-row')
        .filter({ hasText: 'North B Street' })
        .click()
      expect(
        await partialPlaces
          .getByRole('checkbox', { name: 'B Street', exact: true })
          .evaluate(element => (element as HTMLInputElement).indeterminate)
      ).toBe(true)
      await normalizePageForPointerScreenshot(page)
      await expect(page).toHaveScreenshot(
        `places-partial-${viewport.width}.png`
      )
      await page.keyboard.press('Escape')

      const typeTrigger = page.getByRole('button', { name: 'Type: All types' })
      await typeTrigger.click()
      const type = await visibleFilterPopover(page, 'type')
      await expectNarrowFilterGeometry(page, typeTrigger, type)
      await type
        .getByTestId('filter-checkbox-row')
        .filter({ hasText: 'Events' })
        .click()
      await normalizePageForPointerScreenshot(page)
      await expect(page).toHaveScreenshot(`type-selected-${viewport.width}.png`)
      await page.keyboard.press('Escape')

      const organizerTrigger = page.getByRole('button', {
        name: 'Organizer: All organizers'
      })
      await organizerTrigger.click()
      const organizer = await visibleFilterPopover(page, 'organizer')
      await expectNarrowFilterGeometry(page, organizerTrigger, organizer)
      await normalizePageForPointerScreenshot(page)
      await expect(page).toHaveScreenshot(`organizer-${viewport.width}.png`)
      await organizer
        .getByRole('textbox', { name: 'Search organizers' })
        .fill('community')
      await expect(
        organizer.getByRole('checkbox', {
          name: 'Bay Area Community Health Advisory Council'
        })
      ).toBeVisible()
      await normalizePageForPointerScreenshot(page)
      await expect(page).toHaveScreenshot(
        `organizer-long-${viewport.width}.png`
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
    await expect(calendarMenu).toBeFocused()

    const addMenu = page.getByRole('button', { name: 'Add to calendar' })
    await addMenu.click()
    await expect(page).toHaveScreenshot('desktop-add-menu.png')
    await page.keyboard.press('Escape')
    await expect(addMenu).toBeFocused()

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
    await page
      .getByRole('button', { name: /Walk, Run, Ride to the Moon/ })
      .click()
    await expect(page).toHaveScreenshot('desktop-overflow-detail.png')
    await page.getByRole('button', { name: /Back to/ }).click()
    await page.keyboard.press('Escape')

    await page.getByRole('tab', { name: 'List' }).click()
    await expect(page).toHaveScreenshot('desktop-list.png')
    await page.getByRole('button', { name: /Yoga in the Park/ }).click()
    await expect(page).toHaveScreenshot('desktop-list-detail.png')
  })

  test('covers narrow List event disclosure', async ({ page }) => {
    await openFixture(page, { width: 390, height: 1000 })
    await page.getByRole('tab', { name: 'List' }).click()
    await page.getByRole('button', { name: /Yoga in the Park/ }).click()
    await expect(page).toHaveScreenshot('mobile-list-detail-390.png')
  })

  test('covers narrow menus and compact Grid at 320px', async ({ page }) => {
    await openFixture(page, { width: 320, height: 1000 })
    const calendarMenu = page.getByRole('button', {
      name: 'Downtown San Mateo events'
    })
    await calendarMenu.click()
    await expect(page).toHaveScreenshot('mobile-calendar-menu-320.png')
    await page.keyboard.press('Escape')
    await expect(calendarMenu).toBeFocused()

    const addMenu = page.getByRole('button', { name: 'Add to calendar' })
    await addMenu.click()
    await expect(page).toHaveScreenshot('mobile-add-menu-320.png')
    await page.keyboard.press('Escape')
    await expect(addMenu).toBeFocused()

    await page.getByRole('tab', { name: 'Grid' }).click()
    await expect(page).toHaveScreenshot('mobile-compact-grid-320.png')
    await page
      .getByRole('button', {
        name: /Saturday, September 12, 2026, 4 events\. Show in List\./
      })
      .click()
    await expect(page.getByRole('tab', { name: 'List' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    await expect(page).toHaveScreenshot('mobile-grid-to-list-320.png')
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
    const pointerControl = allTypesRow.locator('[data-part="control"]')
    expect((await outline(allTypesRow)).style).toBe('none')
    expect((await outline(pointerControl)).style).toBe('none')
    await page.keyboard.press('Escape')
    await expect(popover).toBeHidden()
    await expect(trigger).toBeFocused()

    await trigger.press('Enter')
    const keyboardPopover = await visibleFilterPopover(page, 'type')
    const keyboardRow = keyboardPopover
      .getByTestId('filter-checkbox-row')
      .filter({ hasText: 'All types' })
    const keyboardControl = keyboardRow.locator('[data-part="control"]')
    expect((await outline(keyboardRow)).style).toBe('none')
    const keyboardOutline = await outline(keyboardControl)
    expect(keyboardOutline.style).not.toBe('none')
    expect(keyboardOutline.width).toBeGreaterThanOrEqual(2)
    await keyboardPopover
      .getByRole('button', { name: 'Close type filters' })
      .click()
    await expect(keyboardPopover).toBeHidden()
    await expect(trigger).toBeFocused()
  })
})
