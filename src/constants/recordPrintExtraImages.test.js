import { describe, expect, it } from 'vitest'

import {
  normalizeExtraImagesSettings,
  normalizeSourceImageUrls,
  resolveExtraImagesForDisplay
} from '@/constants/recordPrintExtraImages'

describe('recordPrintExtraImages', () => {
  const sourceUrls = [
    'https://example.com/a.jpg',
    'https://example.com/b.jpg',
    'https://example.com/c.jpg'
  ]

  it('defaults to all source images selected', () => {
    const settings = normalizeExtraImagesSettings(null, sourceUrls)
    expect(settings.selectedUrls).toEqual(sourceUrls)
    expect(settings.size).toBe('5:4')
    expect(settings.gapPx).toBe(10)
    expect(settings.roundedCorners).toBe(false)
  })

  it('keeps only selected urls that still exist on the record', () => {
    const settings = normalizeExtraImagesSettings(
      {
        selectedUrls: [sourceUrls[0], sourceUrls[2], 'https://example.com/missing.jpg'],
        size: '1:1',
        gapPx: 0,
        roundedCorners: true
      },
      sourceUrls
    )

    expect(settings.selectedUrls).toEqual([sourceUrls[0], sourceUrls[2]])
    expect(settings.size).toBe('1:1')
    expect(settings.gapPx).toBe(0)
    expect(settings.roundedCorners).toBe(true)
  })

  it('maps legacy border flag to gap', () => {
    expect(normalizeExtraImagesSettings({ border: true }, sourceUrls).gapPx).toBe(10)
    expect(normalizeExtraImagesSettings({ border: false }, sourceUrls).gapPx).toBe(0)
  })

  it('resolves display props for ExtraImages', () => {
    const display = resolveExtraImagesForDisplay(
      {
        selectedUrls: [sourceUrls[1], sourceUrls[2]],
        size: '3:2',
        gapPx: 8,
        roundedCorners: true
      },
      sourceUrls
    )

    expect(display).toEqual({
      images: [sourceUrls[1], sourceUrls[2]],
      size: '3:2',
      displayOrder: 'horizontal',
      gapPx: 8,
      roundedCorners: true
    })
  })

  it('forces zero gap when only one image is shown', () => {
    const display = resolveExtraImagesForDisplay(
      { selectedUrls: [sourceUrls[0]], gapPx: 12, roundedCorners: true },
      sourceUrls
    )

    expect(display.gapPx).toBe(0)
    expect(display.roundedCorners).toBe(true)
  })

  it('normalizes source image urls to max 3 trimmed strings', () => {
    expect(
      normalizeSourceImageUrls([' https://a ', '', null, 'https://b', 'https://c', 'https://d'])
    ).toEqual(['https://a', 'https://b', 'https://c'])
  })
})
