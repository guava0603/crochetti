import { describe, expect, it } from 'vitest'

import {
  completedTimeIndexToPrecision,
  completedTimePrecisionToIndex,
  formatCompletedTimeForPrint,
  normalizeCompletedTimeSettings
} from '@/constants/recordPrintCompletedTime'

describe('recordPrintCompletedTime', () => {
  const sampleMs = new Date('2026-05-20T13:30:45.000Z').getTime()

  it('defaults precision to minute', () => {
    expect(normalizeCompletedTimeSettings(null).precision).toBe('minute')
  })

  it('maps slider index to precision units', () => {
    expect(completedTimeIndexToPrecision(0)).toBe('year')
    expect(completedTimeIndexToPrecision(5)).toBe('second')
    expect(completedTimePrecisionToIndex('day')).toBe(2)
  })

  it('formats with the selected minimum unit', () => {
    const locale = 'en-US'
    const yearText = formatCompletedTimeForPrint(sampleMs, 'year', { locale })
    const monthText = formatCompletedTimeForPrint(sampleMs, 'month', { locale })
    const dayText = formatCompletedTimeForPrint(sampleMs, 'day', { locale })
    const minuteText = formatCompletedTimeForPrint(sampleMs, 'minute', { locale })
    const secondText = formatCompletedTimeForPrint(sampleMs, 'second', { locale })

    expect(yearText).toBe('2026')
    expect(monthText).toMatch(/^05\/2026$/)
    expect(dayText).toMatch(/^05\/20\/2026$/)
    expect(minuteText).toMatch(/30/)
    expect(secondText).toMatch(/45/)
    expect(secondText.length).toBeGreaterThan(minuteText.length)
  })
})
