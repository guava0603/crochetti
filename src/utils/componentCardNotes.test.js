import { describe, expect, it } from 'vitest'
import { componentNotesDisplayLines, ensureComponentNotesArray } from './componentCardNotes'

describe('componentCardNotes', () => {
  it('componentNotesDisplayLines maps legacy objects and trims', () => {
    expect(
      componentNotesDisplayLines(['  a  ', { description: 'b' }, '', { description: '  ' }])
    ).toEqual(['a', 'b'])
  })

  it('ensureComponentNotesArray normalizes in place', () => {
    const component = { notes: [{ description: 'x' }, null, 'y'] }
    ensureComponentNotesArray(component)
    expect(component.notes).toEqual(['x', 'y'])
  })
})
