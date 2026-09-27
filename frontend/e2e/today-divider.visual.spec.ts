import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  closeMenuAndRestoreFocus,
  openMenuAndFocus,
  selectCalendarRepresentation
} from './contract-helpers'

const noTodayEvent = new Date('2026-09-20T12:00:00-07:00')
const todayEvent = new Date('2026-09-26T12:00:00-07:00')

async function openFixture(
  page: Page,
  width: number,
  now: Date,
  scenario = 'busy'
) {
  await page.setViewportSize({ width, height: 1000 })
  await page.clock.setFixedTime(now)
  await page.goto(`/?__scenario=${scenario}`)
  await expect(
    page.getByRole('button', { name: /Neighborhood cleanup/ })
  ).toBeVisible()
}

async function subscriptionUrl(page: Page) {
  const trigger = page.getByRole('button', { name: 'Add to calendar' })
  const menu = await openMenuAndFocus(page, trigger)
  const appleLink = page
    .getByText('Apple Calendar')
    .locator('xpath=ancestor::a[1]')
  await expect(appleLink).toBeVisible()
  const url = await appleLink.getAttribute('href')
  await closeMenuAndRestoreFocus(page, trigger, menu)
  return url
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
    beforeCard,
    afterCard,
    secondPeer,
    todayBefore,
    todayAfter,
    label,
    firstCard,
    lastCard
  ] = await Promise.all([
    page.getByRole('tabpanel', { name: 'List' }).boundingBox(),
    ordinaryRule.boundingBox(),
    row5.getByRole('button').first().boundingBox(),
    row12.getByRole('button').first().boundingBox(),
    row12.getByRole('button').nth(1).boundingBox(),
    row19.getByRole('button').first().boundingBox(),
    row26.getByRole('button').first().boundingBox(),
    divider.locator('p').boundingBox(),
    row5.getByRole('button').first().boundingBox(),
    row26.getByRole('button').first().boundingBox()
  ])
  const sameDayGap = secondPeer!.y - (afterCard!.y + afterCard!.height)
  const cardInset = await row12
    .getByRole('button')
    .first()
    .evaluate(element =>
      Number.parseFloat(getComputedStyle(element).paddingTop)
    )
  expect(cardInset).toBeGreaterThan(0)
  expect(sameDayGap).toBeGreaterThanOrEqual(cardInset)
  const ordinaryDateBreak = afterCard!.y - (beforeCard!.y + beforeCard!.height)
  const ruleGapBefore = normalRule!.y - (beforeCard!.y + beforeCard!.height)
  const ruleGapAfter = afterCard!.y - (normalRule!.y + normalRule!.height)
  const todayGapBefore = label!.y - (todayBefore!.y + todayBefore!.height)
  const todayGapAfter = todayAfter!.y - (label!.y + label!.height)
  expect(ordinaryDateBreak).toBeGreaterThan(sameDayGap)
  expect(ordinaryDateBreak).toBeLessThan(2 * sameDayGap)
  expect(todayGapBefore).toBeGreaterThanOrEqual(cardInset)
  expect(todayGapAfter).toBeGreaterThanOrEqual(cardInset)
  expect(Math.abs(ruleGapBefore - todayGapBefore)).toBeLessThanOrEqual(1)
  expect(Math.abs(ruleGapAfter - todayGapAfter)).toBeLessThanOrEqual(1)
  const edgeTop = firstCard!.y - list!.y
  const edgeBottom = list!.y + list!.height - (lastCard!.y + lastCard!.height)
  expect(edgeTop).toBeGreaterThan(sameDayGap)
  expect(edgeBottom).toBeGreaterThan(sameDayGap)
  expect(Math.abs(edgeTop - edgeBottom)).toBeLessThanOrEqual(1)
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
      await selectCalendarRepresentation(page, 'List')
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
      expect(errors).toEqual([])
      expect(await subscriptionUrl(page)).toBe(
        'webcal://localhost:8787/dtsm-events.ics'
      )
    })
  }
}

for (const width of [1280, 390, 320]) {
  test(`sparse 2/1/2/1 date groups at ${width}px`, async ({
    page
  }, testInfo) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => {
      if (message.type() === 'error') errors.push(message.text())
    })
    await openFixture(
      page,
      width,
      new Date('2026-09-30T12:00:00-07:00'),
      'boundary-density'
    )
    await selectCalendarRepresentation(page, 'List')

    const day12 = page.locator('#calendar-list-day-2026-09-12')
    const day17 = page.locator('#calendar-list-day-2026-09-17')
    const day19 = page.locator('#calendar-list-day-2026-09-19')
    const day26 = page.locator('#calendar-list-day-2026-09-26')
    for (const [group, count] of [
      [day12, 2],
      [day17, 1],
      [day19, 2],
      [day26, 1]
    ] as const)
      await expect(group.getByRole('button')).toHaveCount(count)

    const [first12, second12, first19, second19] = await Promise.all([
      day12.getByRole('button').first().boundingBox(),
      day12.getByRole('button').nth(1).boundingBox(),
      day19.getByRole('button').first().boundingBox(),
      day19.getByRole('button').nth(1).boundingBox()
    ])
    const sameDayGaps = [
      second12!.y - (first12!.y + first12!.height),
      second19!.y - (first19!.y + first19!.height)
    ]
    const cardInset = await day12
      .getByRole('button')
      .first()
      .evaluate(element =>
        Number.parseFloat(getComputedStyle(element).paddingTop)
      )
    const sameDayGap = Math.min(...sameDayGaps)
    expect(sameDayGap).toBeGreaterThanOrEqual(cardInset)
    expect(Math.abs(sameDayGaps[0]! - sameDayGaps[1]!)).toBeLessThanOrEqual(1)

    const transitions = [
      [day12, day17],
      [day17, day19],
      [day19, day26]
    ] as const
    for (const [previous, next] of transitions) {
      const [lastCard, firstCard] = await Promise.all([
        previous.getByRole('button').last().boundingBox(),
        next.getByRole('button').first().boundingBox()
      ])
      const dateBreak = firstCard!.y - (lastCard!.y + lastCard!.height)
      expect(dateBreak).toBeGreaterThan(sameDayGap)
      expect(dateBreak).toBeLessThan(2 * sameDayGap)
    }

    const divider = page.locator('#calendar-today-divider')
    await expect(divider).toHaveAccessibleName(
      'Today, Wednesday, September 30, 2026'
    )
    expect(
      await divider.evaluate(element => element.previousElementSibling?.id)
    ).toBe('calendar-list-day-2026-09-26')
    expect(
      await divider.evaluate(element => element.nextElementSibling)
    ).toBeNull()
    await expect(day26).toHaveCSS('border-bottom-width', '0px')
    const [list, lastCard, label, dividerBox, firstCard] = await Promise.all([
      page.getByRole('tabpanel', { name: 'List' }).boundingBox(),
      day26.getByRole('button').first().boundingBox(),
      divider.locator('p').boundingBox(),
      divider.boundingBox(),
      day12.getByRole('button').first().boundingBox()
    ])
    const textClearance = label!.y - (lastCard!.y + lastCard!.height)
    expect(textClearance).toBeGreaterThanOrEqual(cardInset)
    expect(dividerBox!.height).toBeCloseTo(label!.height, 1)
    const edgeTop = firstCard!.y - list!.y
    const edgeBottom =
      list!.y + list!.height - (dividerBox!.y + dividerBox!.height)
    expect(Math.abs(edgeTop - edgeBottom)).toBeLessThanOrEqual(1)
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth)
    ).toBe(width)
    expect(await contrastRatio(page)).toBeGreaterThanOrEqual(4.5)
    expect(errors).toEqual([])
    await testInfo.attach(`Sparse List at ${width}px`, {
      body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
      contentType: 'image/png'
    })
    expect(await subscriptionUrl(page)).toBe(
      'webcal://localhost:8787/dtsm-events.ics'
    )
  })
}

test('Today boundary grows with wrapped label content', async ({ page }) => {
  await openFixture(page, 320, noTodayEvent)
  await selectCalendarRepresentation(page, 'List')
  const divider = page.locator('#calendar-today-divider')
  const label = divider.locator('p')
  const followingGroup = page.locator('#calendar-list-day-2026-09-26')
  const [beforeDivider, beforeLabel, beforeGroup] = await Promise.all([
    divider.boundingBox(),
    label.boundingBox(),
    followingGroup.boundingBox()
  ])
  await label.evaluate(element => {
    element.textContent =
      'Today · Sunday, September 20, 2026. This longer label checks that the boundary follows its content and keeps the next date group clear.'
  })
  const [afterDivider, afterLabel, afterGroup] = await Promise.all([
    divider.boundingBox(),
    label.boundingBox(),
    followingGroup.boundingBox()
  ])
  expect(afterLabel!.height).toBeGreaterThan(beforeLabel!.height)
  expect(afterDivider!.height).toBeCloseTo(afterLabel!.height, 1)
  expect(afterGroup!.y - beforeGroup!.y).toBeCloseTo(
    afterDivider!.height - beforeDivider!.height,
    1
  )
  const beforeGap = beforeGroup!.y - (beforeDivider!.y + beforeDivider!.height)
  const afterGap = afterGroup!.y - (afterDivider!.y + afterDivider!.height)
  expect(afterGap).toBeCloseTo(beforeGap, 1)
  expect(afterGap).toBeGreaterThan(0)
})

for (const [instant, position] of [
  ['2026-09-01T12:00:00-07:00', 'start'],
  ['2026-09-30T12:00:00-07:00', 'end']
] as const) {
  test(`Today divider at the ${position} stays inside the List`, async ({
    page
  }) => {
    await openFixture(page, 320, new Date(instant))
    await selectCalendarRepresentation(page, 'List')
    const divider = page.locator('#calendar-today-divider')
    const list = page.getByRole('tabpanel', { name: 'List' })
    const [dividerBox, listBox] = await Promise.all([
      divider.boundingBox(),
      list.boundingBox()
    ])
    const ordinaryRule = page
      .locator('#calendar-list-day-2026-09-05')
      .locator('xpath=following-sibling::*[1]')
    const labelBox = await divider.locator('p').boundingBox()
    expect(dividerBox!.y).toBeGreaterThanOrEqual(listBox!.y)
    expect(dividerBox!.y + dividerBox!.height).toBeLessThanOrEqual(
      listBox!.y + listBox!.height
    )
    const row12 = page.locator('#calendar-list-day-2026-09-12')
    const firstSameDay = await row12.getByRole('button').first().boundingBox()
    const secondSameDay = await row12.getByRole('button').nth(1).boundingBox()
    const sameDayGap =
      secondSameDay!.y - (firstSameDay!.y + firstSameDay!.height)
    const cardInset = await row12
      .getByRole('button')
      .first()
      .evaluate(element =>
        Number.parseFloat(getComputedStyle(element).paddingTop)
      )
    expect(sameDayGap).toBeGreaterThanOrEqual(cardInset)
    await expect(ordinaryRule).toHaveCSS('height', '1px')
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
        row12.getByRole('button').first().boundingBox()
      ])
      const textClearance = firstCard!.y - (labelBox!.y + labelBox!.height)
      const ordinaryDateBreak = nextCard!.y - (firstCard!.y + firstCard!.height)
      expect(textClearance).toBeGreaterThanOrEqual(cardInset)
      expect(ordinaryDateBreak).toBeGreaterThan(sameDayGap)
      expect(ordinaryDateBreak).toBeLessThan(2 * sameDayGap)
      expect(labelBox!.y - listBox!.y).toBeGreaterThan(0)
    } else {
      expect(
        await divider.evaluate(element => element.nextElementSibling)
      ).toBeNull()
      await expect(page.locator('#calendar-list-day-2026-09-26')).toHaveCSS(
        'border-bottom-width',
        '0px'
      )
      const [lastCard, earlierCard, nextCard] = await Promise.all([
        page
          .locator('#calendar-list-day-2026-09-26')
          .getByRole('button')
          .first()
          .boundingBox(),
        page
          .locator('#calendar-list-day-2026-09-05')
          .getByRole('button')
          .first()
          .boundingBox(),
        row12.getByRole('button').first().boundingBox()
      ])
      const textClearance = labelBox!.y - (lastCard!.y + lastCard!.height)
      const edgeInset =
        listBox!.y + listBox!.height - (labelBox!.y + labelBox!.height)
      const edgeTop = earlierCard!.y - listBox!.y
      const ordinaryDateBreak =
        nextCard!.y - (earlierCard!.y + earlierCard!.height)
      expect(textClearance).toBeGreaterThanOrEqual(cardInset)
      expect(edgeInset).toBeGreaterThan(0)
      expect(Math.abs(edgeInset - edgeTop)).toBeLessThanOrEqual(1)
      expect(ordinaryDateBreak).toBeGreaterThan(sameDayGap)
      expect(ordinaryDateBreak).toBeLessThan(2 * sameDayGap)
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
    await selectCalendarRepresentation(page, 'List')
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
    await selectCalendarRepresentation(page, 'Grid')
    const today = page.getByRole('button', { name: /Go to today,/ })
    await expect(today).toBeDisabled()
    await expect(today).toContainText('Today · Sep 26')
    await expect(page.locator('#calendar-today-divider')).toHaveCount(0)
    expect(await backgroundColor(page, '26')).toBe('rgb(20, 36, 59)')
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
  await selectCalendarRepresentation(page, 'Grid')
  expect(await backgroundColor(page, '26')).toBe('rgb(20, 36, 59)')
  await selectCalendarRepresentation(page, 'List')
  await page.clock.runFor(10_100)
  await expect(page.locator('#calendar-today-divider')).toContainText(
    'Today · Sun, Sep 27'
  )
  await expect(page.getByRole('heading', { level: 2 })).toContainText(
    'September 2026'
  )
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  await selectCalendarRepresentation(page, 'Grid')
  expect(await backgroundColor(page, '26')).toBe('rgb(20, 31, 44)')
  expect(await backgroundColor(page, '27')).toBe('rgb(20, 36, 59)')
  await expect(
    page.getByRole('button', { name: /Go to today,/ })
  ).toContainText('Today · Sep 27')
})
