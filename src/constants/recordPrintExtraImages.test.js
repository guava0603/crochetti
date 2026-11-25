import { describe, expect, it } from 'vitest'

import {
  clampAspectRatio,
  formatExtraImagesAspectRatioCss,
  formatExtraImagesAspectRatioLabel,
  legacySizeToAspect,
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
    expect(settings.aspectRatio).toBe(1.2)
    expect(settings.aspectLandscape).toBe(true)
    expect(settings.gapPx).toBe(10)
    expect(settings.roundedCorners).toBe(false)
  })

  it('keeps only selected urls that still exist on the record', () => {
    const settings = normalizeExtraImagesSettings(
      {
        selectedUrls: [sourceUrls[0], sourceUrls[2], 'https://example.com/missing.jpg'],
        aspectRatio: 2.2,
        aspectLandscape: false,
        gapPx: 0,
        roundedCorners: true
      },
      sourceUrls
    )

    expect(settings.selectedUrls).toEqual([sourceUrls[0], sourceUrls[2]])
    expect(settings.aspectRatio).toBe(2.2)
    expect(settings.aspectLandscape).toBe(false)
    expect(settings.gapPx).toBe(0)
    expect(settings.roundedCorners).toBe(true)
  })

  it('maps legacy size presets to aspect ratio fields', () => {
    expect(legacySizeToAspect('5:4')).toEqual({ aspectRatio: 1.2, aspectLandscape: true })
    expect(legacySizeToAspect('3:2')).toEqual({ aspectRatio: 1.5, aspectLandscape: true })
    expect(legacySizeToAspect('1:1')).toEqual({ aspectRatio: 1, aspectLandscape: true })
    expect(normalizeExtraImagesSettings({ size: '3:2' }, sourceUrls).aspectRatio).toBe(1.5)
  })

  it('maps legacy border flag to gap', () => {
    expect(normalizeExtraImagesSettings({ border: true }, sourceUrls).gapPx).toBe(10)
    expect(normalizeExtraImagesSettings({ border: false }, sourceUrls).gapPx).toBe(0)
  })

  it('clamps aspect ratio to 1–3 in 0.1 steps', () => {
    expect(clampAspectRatio(0.5)).toBe(1)
    expect(clampAspectRatio(3.44)).toBe(3)
    expect(clampAspectRatio(1.23)).toBe(1.2)
  })

  it('formats aspect ratio for css and labels', () => {
    expect(formatExtraImagesAspectRatioCss(1.5, true)).toBe('1.5 / 1')
    expect(formatExtraImagesAspectRatioCss(1.5, false)).toBe('1 / 1.5')
    expect(formatExtraImagesAspectRatioLabel(2, true)).toBe('2:1')
    expect(formatExtraImagesAspectRatioLabel(2, false)).toBe('1:2')
  })

  it('resolves display props for ExtraImages', () => {
    const display = resolveExtraImagesForDisplay(
      {
        selectedUrls: [sourceUrls[1], sourceUrls[2]],
        aspectRatio: 1.8,
        aspectLandscape: true,
        gapPx: 8,
        roundedCorners: true
      },
      sourceUrls
    )

    expect(display).toEqual({
      images: [sourceUrls[1], sourceUrls[2]],
      aspectRatio: 1.8,
      aspectLandscape: true,
      aspectRatioCss: '1.8 / 1',
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
