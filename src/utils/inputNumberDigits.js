export function resolveDigitCount(max) {
  const safeMax = Number.isFinite(max) ? max : 999
  if (safeMax <= 9) return 1
  if (safeMax <= 99) return 2
  return 3
}

export function clampInputNumber(value, { min = 0, max = 999 } = {}) {
  const safeMin = Number.isFinite(min) ? min : 0
  const safeMax = Number.isFinite(max) ? max : 999
  const n = Number(value)
  if (!Number.isFinite(n)) return safeMin
  return Math.max(safeMin, Math.min(safeMax, Math.trunc(n)))
}

export function decomposeDigits(value, digitCount) {
  const count = Math.max(1, Math.min(3, Number(digitCount) || 1))
  let remaining = Math.max(0, Math.trunc(Number(value) || 0))
  const digits = []

  for (let i = 0; i < count; i += 1) {
    digits.unshift(remaining % 10)
    remaining = Math.floor(remaining / 10)
  }

  return digits
}

export function composeDigits(digits) {
  const list = Array.isArray(digits) ? digits : []
  return list.reduce((total, digit) => total * 10 + (Number(digit) || 0), 0)
}

function clampDigit(value) {
  return Math.max(0, Math.min(9, Math.trunc(Number(value) || 0)))
}

function composeWithVariableTail(fixedDigits, digitCount, variableStartIndex, fillDigit) {
  const count = Math.max(1, Math.min(3, Number(digitCount) || 1))
  const next = Array.from({ length: count }, (_, index) => {
    if (index < variableStartIndex) {
      return clampDigit(fixedDigits[index])
    }
    return fillDigit
  })
  return composeDigits(next)
}

export function getAllowedDigitsForPosition({
  min = 0,
  max = 999,
  digitCount = 1,
  digitIndex = 0,
  digits = []
} = {}) {
  const safeMin = Number.isFinite(min) ? min : 0
  const safeMax = Number.isFinite(max) ? max : 999
  const count = Math.max(1, Math.min(3, Number(digitCount) || 1))
  const index = Math.max(0, Math.min(count - 1, Number(digitIndex) || 0))
  const current = Array.isArray(digits) ? digits : []
  const allowed = []

  for (let candidate = 0; candidate <= 9; candidate += 1) {
    const prefix = Array.from({ length: count }, (_, i) => {
      if (i < index) return clampDigit(current[i])
      if (i === index) return candidate
      return 0
    })

    const minPossible = composeWithVariableTail(prefix, count, index + 1, 0)
    const maxPossible = composeWithVariableTail(prefix, count, index + 1, 9)

    if (maxPossible >= safeMin && minPossible <= safeMax) {
      allowed.push(candidate)
    }
  }

  return allowed
}

export function resolveDigitOptions({
  min = 0,
  max = 999,
  value = 0
} = {}) {
  const safeMin = Number.isFinite(min) ? min : 0
  const safeMax = Number.isFinite(max) ? max : 999
  const count = resolveDigitCount(safeMax)
  const clamped = clampInputNumber(value, { min: safeMin, max: safeMax })
  const digits = decomposeDigits(clamped, count)

  return Array.from({ length: count }, (_, index) => getAllowedDigitsForPosition({
    min: safeMin,
    max: safeMax,
    digitCount: count,
    digitIndex: index,
    digits
  }))
}
