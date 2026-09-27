import { expect, test } from '@playwright/test'

// These are review inputs, not golden images. Assertions elsewhere judge the
// relationships; these four captures let a reviewer question the composition.
for (const [view, width] of [
  ['List', 1280],
  ['List', 390],
  ['List', 320],
  ['Grid', 1280]
] as const) {
  test(`review ${view} composition at ${width}px`, async ({
    page
  }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.clock.setFixedTime(new Date('2026-09-20T12:00:00-07:00'))
    await page.goto('/?__scenario=busy')
    await expect(
      page.getByRole('button', { name: /Yoga in the Park/ })
    ).toBeVisible()
    await page.getByRole('tab', { name: view }).click()
    await page.mouse.move(0, 0)
    const panel = page.getByRole('tabpanel', { name: view })
    await expect(panel).toBeVisible()
    const path = testInfo.outputPath(`${view.toLowerCase()}-${width}.png`)
    await page.screenshot({ path, fullPage: true, animations: 'disabled' })
    await testInfo.attach(`${view} at ${width}px`, {
      path,
      contentType: 'image/png'
    })
  })
}
