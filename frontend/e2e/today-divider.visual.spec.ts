import { expect, test, type Locator, type Page } from '@playwright/test'

const noTodayEvent = new Date('2026-09-20T12:00:00-07:00')
const todayEvent = new Date('2026-09-26T12:00:00-07:00')

async function openFixture(page: Page, width: number, now: Date) {
  await page.setViewportSize({ width, height: 1000 })
  await page.clock.setFixedTime(now)
  await page.goto('/?__scenario=busy')
  await expect(
    page.getByRole('button', { name: /Yoga in the Park/ })
  ).toBeVisible()
}

async function subscriptionUrl(page: Page) {
  await page.getByRole('button', { name: 'Add to calendar' }).click()
  return page
    .getByText('Apple Calendar')
    .locator('xpath=ancestor::a[1]')
    .getAttribute('href')
}

async function contrastRatio(page: Page) {
  return page.locator('#calendar-today-divider p').evaluate(element => {
    const rgb = (value: string) =>
      value
        .match(/\d+(?:\.\d+)?/g)!
        .slice(0, 3)
        .map(Number)
    const linear = (channel: number) => {
      const value = channel / 255
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    }
    const luminance = (color: number[]) =>
      0.2126 * linear(color[0]!) +
      0.7152 * linear(color[1]!) +
      0.0722 * linear(color[2]!)
    const foreground = luminance(rgb(getComputedStyle(element).color))
    const background = luminance(
      rgb(
        getComputedStyle(element.closest('[data-scope="tabs"]')!)
          .backgroundColor
      )
    )
    return (
      (Math.max(foreground, background) + 0.05) /
      (Math.min(foreground, background) + 0.05)
    )
  })
}

function gridDay(page: Page, day: string) {
  return page
    .getByRole('table', { name: 'September 2026' })
    .getByText(day, { exact: true })
    .locator('xpath=ancestor::*[@role="cell"][1]')
}

async function backgroundColor(page: Page, day: string) {
  return gridDay(page, day).evaluate(
    element => getComputedStyle(element).backgroundColor
  )
}

async function expectBoundaryRhythm(page: Page, divider: Locator) {
  const row5 = page.locator('#calendar-list-day-2026-09-05')
  const row12 = page.locator('#calendar-list-day-2026-09-12')
  const row19 = page.locator('#calendar-list-day-2026-09-19')
  const row26 = page.locator('#calendar-list-day-2026-09-26')
  await expect(row5).toHaveCSS('border-bottom-width', '0px')
  await expect(row19).toHaveCSS('border-bottom-width', '0px')
  const ordinaryRule = row5.locator('xpath=following-sibling::*[1]')
  await expect(ordinaryRule).toHaveCSS('height', '1px')
  expect(
    await divider.evaluate(element => element.previousElementSibling?.id)
  ).toBe('calendar-list-day-2026-09-19')
  expect(await row26.evaluate(element => element.nextElementSibling)).toBeNull()
  const [
    list,
    normalRule,
    normalBefore,
    normalAfter,
    secondSameDay,
    boundaryBefore,
    boundaryAfter,
    label
  ] = await Promise.all([
    page.getByRole('tabpanel', { name: 'List' }).boundingBox(),
    ordinaryRule.boundingBox(),
    row5.getByRole('button').first().boundingBox(),
    row12.getByRole('button').first().boundingBox(),
    row12.getByRole('button').nth(1).boundingBox(),
    row19.getByRole('button').first().boundingBox(),
    row26.getByRole('button').first().boundingBox(),
    divider.locator('p').boundingBox()
  ])
  const normalLine = normalRule!.y + normalRule!.height / 2
  const sameDayGap = secondSameDay!.y - (normalAfter!.y + normalAfter!.height)
  expect(sameDayGap).toBe(8)
  const beforeText = label!.y - (boundaryBefore!.y + boundaryBefore!.height)
  const afterText = boundaryAfter!.y - (label!.y + label!.height)
  expect(beforeText).toBeGreaterThanOrEqual(7.5)
  expect(afterText).toBeGreaterThanOrEqual(7.5)
  const gaps = [
    normalBefore!.y - list!.y,
    normalLine - (normalBefore!.y + normalBefore!.height),
    normalAfter!.y - normalLine,
    beforeText,
    afterText,
    list!.y + list!.height - (boundaryAfter!.y + boundaryAfter!.height)
  ]
  for (const gap of gaps)
    expect(Math.abs(gap - sameDayGap)).toBeLessThanOrEqual(2)
}

for (const [width, name] of [
  [1280, 'desktop'],
  [390, 'mobile-390'],
  [320, 'mobile-320']
] as const) {
  for (const [state, now, nextDay, label] of [
    ['no-today-event', noTodayEvent, '2026-09-26', 'Today · Sun, Sep 20'],
    ['today-event', todayEvent, '2026-09-26', 'Today · Sat, Sep 26']
  ] as const) {
    test(`${name} List shows the ${state} date boundary`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text())
      })
      await openFixture(page, width, now)
      await page.getByRole('tab', { name: 'List' }).click()
      const divider = page.locator('#calendar-today-divider')
      await expect(divider).toHaveCount(1)
      await expect(divider).toContainText(label)
      expect(
        await divider.evaluate(element => element.nextElementSibling?.id)
      ).toBe(`calendar-list-day-${nextDay}`)
      await expectBoundaryRhythm(page, divider)
      const today = page.getByRole('button', { name: /Go to today,/ })
      await expect(today).toBeEnabled()
      await expect(today).toContainText(
        state === 'today-event' ? 'Today · Sep 26' : 'Today · Sep 20'
      )
      expect(await contrastRatio(page)).toBeGreaterThanOrEqual(4.5)
      if (width <= 390) {
        const box = await today.boundingBox()
        expect(box!.height).toBeGreaterThanOrEqual(43.5)
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth)
      ).toBe(width)
      await expect(page).toHaveScreenshot(`${name}-list-${state}.png`, {
        fullPage: true
      })
      expect(errors).toEqual([])
      expect(await subscriptionUrl(page)).toBe(
        'webcal://localhost:8787/dtsm-events.ics'
      )
    })
  }
}

for (const [instant, position] of [
  ['2026-09-01T12:00:00-07:00', 'start'],
  ['2026-09-30T12:00:00-07:00', 'end']
] as const) {
  test(`Today divider at the ${position} stays inside the List`, async ({
    page
  }) => {
    await openFixture(page, 320, new Date(instant))
    await page.getByRole('tab', { name: 'List' }).click()
    const divider = page.locator('#calendar-today-divider')
    const list = page.getByRole('tabpanel', { name: 'List' })
    const [dividerBox, listBox] = await Promise.all([
      divider.boundingBox(),
      list.boundingBox()
    ])
    const ordinaryRule = page
      .locator('#calendar-list-day-2026-09-05')
      .locator('xpath=following-sibling::*[1]')
    const [ordinaryRuleBox, labelBox] = await Promise.all([
      ordinaryRule.boundingBox(),
      divider.locator('p').boundingBox()
    ])
    const ordinaryLine = ordinaryRuleBox!.y + ordinaryRuleBox!.height / 2
    expect(dividerBox!.y).toBeGreaterThanOrEqual(listBox!.y)
    expect(dividerBox!.y + dividerBox!.height).toBeLessThanOrEqual(
      listBox!.y + listBox!.height
    )
    if (position === 'start') {
      expect(
        await divider.evaluate(element => element.previousElementSibling)
      ).toBeNull()
      const [firstCard, nextCard] = await Promise.all([
        page
          .locator('#calendar-list-day-2026-09-05')
          .getByRole('button')
          .first()
          .boundingBox(),
        page
          .locator('#calendar-list-day-2026-09-12')
          .getByRole('button')
          .first()
          .boundingBox()
      ])
      expect(
        Math.abs(
          firstCard!.y -
            (labelBox!.y + labelBox!.height) -
            (nextCard!.y - ordinaryLine)
        )
      ).toBeLessThanOrEqual(2)
      expect(labelBox!.y - listBox!.y).toBeGreaterThanOrEqual(7.5)
    } else {
      expect(
        await divider.evaluate(element => element.nextElementSibling)
      ).toBeNull()
      await expect(page.locator('#calendar-list-day-2026-09-26')).toHaveCSS(
        'border-bottom-width',
        '0px'
      )
      const [lastCard, earlierCard] = await Promise.all([
        page
          .locator('#calendar-list-day-2026-09-26')
          .getByRole('button')
          .first()
          .boundingBox(),
        page
          .locator('#calendar-list-day-2026-09-05')
          .getByRole('button')
          .first()
          .boundingBox()
      ])
      expect(
        Math.abs(
          labelBox!.y -
            (lastCard!.y + lastCard!.height) -
            (ordinaryLine - (earlierCard!.y + earlierCard!.height))
        )
      ).toBeLessThanOrEqual(2)
      expect(
        listBox!.y + listBox!.height - (labelBox!.y + labelBox!.height)
      ).toBeGreaterThanOrEqual(7.5)
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth)
    ).toBe(320)
  })
}

for (const width of [1280, 390, 320]) {
  test(`Today returns to List and scrolls the boundary into view at ${width}px`, async ({
    page
  }) => {
    await openFixture(page, width, noTodayEvent)
    await page.getByRole('tab', { name: 'List' }).click()
    await page.setViewportSize({ width, height: 600 })
    await page.getByRole('button', { name: 'Next month' }).click()
    await expect(page.locator('#calendar-today-divider')).toHaveCount(0)
    const today = page.getByRole('button', { name: /Go to today,/ })
    if (width === 320) {
      await today.focus()
      await page.keyboard.press('Enter')
    } else {
      await today.click()
    }
    const divider = page.locator('#calendar-today-divider')
    await expect(divider).toBeFocused()
    await expect(divider).toHaveAccessibleName(
      'Today, Sunday, September 20, 2026'
    )
    const box = await divider.boundingBox()
    expect(box!.y).toBeGreaterThanOrEqual(0)
    expect(box!.y + box!.height).toBeLessThanOrEqual(600)
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
    if (width === 320)
      expect(
        await divider.evaluate(
          element => getComputedStyle(element).outlineStyle
        )
      ).toBe('solid')
    await expect(page.getByRole('heading', { level: 2 })).toContainText(
      'September 2026'
    )
    await today.click()
    await expect(divider).toBeFocused()
    expect(await subscriptionUrl(page)).toBe(
      'webcal://localhost:8787/dtsm-events.ics'
    )
  })

  test(`Grid keeps its today marker and a disabled date cue at ${width}px`, async ({
    page
  }) => {
    await openFixture(page, width, todayEvent)
    await page.getByRole('tab', { name: 'Grid' }).click()
    const today = page.getByRole('button', { name: /Go to today,/ })
    await expect(today).toBeDisabled()
    await expect(today).toContainText('Today · Sep 26')
    await expect(page.locator('#calendar-today-divider')).toHaveCount(0)
    expect(await backgroundColor(page, '26')).toBe('rgb(20, 36, 59)')
    if (width === 320)
      await expect(page).toHaveScreenshot('mobile-320-grid-today.png', {
        fullPage: true
      })
  })
}

test('empty and failed current-month Lists keep the date without a divider', async ({
  page
}) => {
  await page.setViewportSize({ width: 320, height: 1000 })
  await page.clock.setFixedTime(noTodayEvent)
  await page.goto('/?__scenario=empty')
  await expect(
    page.getByText('No events in September 2026 for these filters.')
  ).toBeVisible()
  await expect(page.locator('#calendar-today-divider')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: /Go to today,/ })
  ).toBeDisabled()
  await expect(
    page.getByRole('button', { name: /Go to today,/ })
  ).toContainText('Today · Sep 20')
  await page.goto('/?__scenario=feed-error')
  await expect(page.getByText(/Couldn’t load this calendar/)).toBeVisible()
  await expect(page.locator('#calendar-today-divider')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: /Go to today,/ })
  ).toBeDisabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    320
  )
})

test('LA midnight updates the cue and divider without moving the month or page', async ({
  page
}) => {
  await page.setViewportSize({ width: 320, height: 1000 })
  await page.clock.install({ time: new Date('2026-09-27T06:59:50Z') })
  await page.goto('/?__scenario=busy')
  await expect(page.locator('#calendar-today-divider')).toContainText(
    'Today · Sat, Sep 26'
  )
  await page.getByRole('tab', { name: 'Grid' }).click()
  expect(await backgroundColor(page, '26')).toBe('rgb(20, 36, 59)')
  await page.getByRole('tab', { name: 'List' }).click()
  await page.clock.runFor(10_100)
  await expect(page.locator('#calendar-today-divider')).toContainText(
    'Today · Sun, Sep 27'
  )
  await expect(page.getByRole('heading', { level: 2 })).toContainText(
    'September 2026'
  )
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  await page.getByRole('tab', { name: 'Grid' }).click()
  expect(await backgroundColor(page, '26')).toBe('rgb(20, 31, 44)')
  expect(await backgroundColor(page, '27')).toBe('rgb(20, 36, 59)')
  await expect(
    page.getByRole('button', { name: /Go to today,/ })
  ).toContainText('Today · Sep 27')
})
