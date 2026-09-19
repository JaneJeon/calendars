import { describe, expect, it } from 'vitest'
import { contrastPairs, eventTone } from './theme'

function luminance(hex: string): number {
  const values = hex
    .slice(1)
    .match(/.{2}/g)!
    .map(value => Number.parseInt(value, 16) / 255)
    .map(value =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    )
  return 0.2126 * values[0]! + 0.7152 * values[1]! + 0.0722 * values[2]!
}

describe('verified theme', () => {
  it('keeps every declared semantic pair above its contrast threshold', () => {
    for (const [foreground, background, minimum] of contrastPairs) {
      const lighter = Math.max(luminance(foreground), luminance(background))
      const darker = Math.min(luminance(foreground), luminance(background))
      expect((lighter + 0.05) / (darker + 0.05)).toBeGreaterThanOrEqual(minimum)
    }
  })

  it('defines all four event tone families', () => {
    expect(Object.keys(eventTone)).toEqual([
      'community',
      'market',
      'music',
      'arts'
    ])
  })
})
