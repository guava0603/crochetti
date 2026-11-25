import { describe, expect, it } from 'vitest'
import { isShareCancelled, safeExportFilename } from './nativeImageShare'

describe('nativeImageShare', () => {
  it('safeExportFilename sanitizes and ensures .png extension', () => {
    expect(safeExportFilename('my design.png')).toBe('my_design.png')
    expect(safeExportFilename('foo')).toBe('foo.png')
    expect(safeExportFilename('')).toBe('image.png')
  })

  it('isShareCancelled detects abort and cancel messages', () => {
    expect(isShareCancelled({ name: 'AbortError' })).toBe(true)
    expect(isShareCancelled({ message: 'Share canceled' })).toBe(true)
    expect(isShareCancelled({ message: 'User dismissed' })).toBe(true)
    expect(isShareCancelled(new Error('network'))).toBe(false)
  })
})
