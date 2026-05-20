import { describe, expect, it } from 'vitest'

import {
  clampInputNumber,
  composeDigits,
  decomposeDigits,
  getAllowedDigitsForPosition,
  resolveDigitCount,
  resolveDigitOptions
} from '@/utils/inputNumberDigits'

describe('resolveDigitCount', () => {
  it('uses one digit when max is at most 9', () => {
    expect(resolveDigitCount(9)).toBe(1)
    expect(resolveDigitCount(6)).toBe(1)
    expect(resolveDigitCount(0)).toBe(1)
  })

  it('uses two digits when max is between 10 and 99', () => {
    expect(resolveDigitCount(10)).toBe(2)
    expect(resolveDigitCount(16)).toBe(2)
    expect(resolveDigitCount(99)).toBe(2)
  })

  it('uses three digits when max is greater than 99', () => {
    expect(resolveDigitCount(100)).toBe(3)
    expect(resolveDigitCount(999)).toBe(3)
  })
})

describe('decomposeDigits', () => {
  it('decomposes values into the requested number of digits', () => {
    expect(decomposeDigits(5, 1)).toEqual([5])
    expect(decomposeDigits(5, 2)).toEqual([0, 5])
    expect(decomposeDigits(105, 3)).toEqual([1, 0, 5])
  })
})

describe('composeDigits', () => {
  it('composes digit arrays back into a number', () => {
    expect(composeDigits([0, 5])).toBe(5)
    expect(composeDigits([1, 0, 5])).toBe(105)
  })
})

describe('clampInputNumber', () => {
  it('clamps composed values to min and max', () => {
    expect(clampInputNumber(150, { min: 1, max: 99 })).toBe(99)
    expect(clampInputNumber(0, { min: 2, max: 7 })).toBe(2)
  })
})

describe('getAllowedDigitsForPosition', () => {
  it('limits a single wheel to min-max when max is at most 9', () => {
    expect(getAllowedDigitsForPosition({
      min: 1,
      max: 6,
      digitCount: 1,
      digitIndex: 0,
      digits: [3]
    })).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('limits the tens wheel for max 16', () => {
    expect(getAllowedDigitsForPosition({
      min: 1,
      max: 16,
      digitCount: 2,
      digitIndex: 0,
      digits: [0, 5]
    })).toEqual([0, 1])
  })

  it('limits the ones wheel to 1-9 when tens is 0 and max is 16', () => {
    expect(getAllowedDigitsForPosition({
      min: 1,
      max: 16,
      digitCount: 2,
      digitIndex: 1,
      digits: [0, 5]
    })).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('limits the ones wheel to 0-6 when tens is 1 and max is 16', () => {
    expect(getAllowedDigitsForPosition({
      min: 1,
      max: 16,
      digitCount: 2,
      digitIndex: 1,
      digits: [1, 5]
    })).toEqual([0, 1, 2, 3, 4, 5, 6])
  })
})

describe('resolveDigitOptions', () => {
  it('returns constrained options for each wheel', () => {
    expect(resolveDigitOptions({ min: 1, max: 6, value: 3 })).toEqual([
      [1, 2, 3, 4, 5, 6]
    ])

    expect(resolveDigitOptions({ min: 1, max: 16, value: 12 })).toEqual([
      [0, 1],
      [0, 1, 2, 3, 4, 5, 6]
    ])
  })
})
