import { describe, expect, it } from 'vitest'
import { normalizeUserTab } from './userTab.js'

describe('normalizeUserTab', () => {
  it('maps aliases to tab keys', () => {
    expect(normalizeUserTab('Records')).toBe('record')
    expect(normalizeUserTab('follow')).toBe('following')
    expect(normalizeUserTab('save-project')).toBe('saved')
    expect(normalizeUserTab('projects')).toBe('design')
  })

  it('uses the page fallback for missing or unknown values', () => {
    expect(normalizeUserTab('')).toBe('design')
    expect(normalizeUserTab(undefined, { fallback: 'record' })).toBe('record')
    expect(normalizeUserTab('nope', { fallback: 'record' })).toBe('record')
  })

  it('only resolves tabs the page has', () => {
    const opts = { tabs: ['design', 'record'], fallback: 'design' }
    expect(normalizeUserTab('record', opts)).toBe('record')
    expect(normalizeUserTab('saved', opts)).toBe('design')
  })
})
