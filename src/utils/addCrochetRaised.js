export function toBaseLabelKey(base) {
  if (base === 'X') return 'crochet.stitches.singleCrochet'
  if (base === 'T') return 'crochet.stitches.halfDoubleCrochet'
  if (base === 'F') return 'crochet.stitches.doubleCrochet'
  return 'crochet.stitches.trebleCrochet'
}

export function raisedSymbolPrefix(type, t) {
  if (type === 'popcorn') return t('toolbar.addCrochet.moreWizard.raisedSymbolPrefix.popcorn')
  if (type === 'puff') return t('toolbar.addCrochet.moreWizard.raisedSymbolPrefix.puff')
  if (type === 'bobble') return t('toolbar.addCrochet.moreWizard.raisedSymbolPrefix.bobble')
  if (type === 'corkscrew') return t('toolbar.addCrochet.moreWizard.raisedSymbolPrefix.corkscrew')
  return ''
}

export function raisedPlainSymbol(type, t) {
  if (type === 'popcorn') return t('toolbar.addCrochet.moreWizard.raisedSymbolPlain.popcorn')
  if (type === 'puff') return t('toolbar.addCrochet.moreWizard.raisedSymbolPlain.puff')
  if (type === 'bobble') return t('toolbar.addCrochet.moreWizard.raisedSymbolPlain.bobble')
  if (type === 'corkscrew') return t('toolbar.addCrochet.moreWizard.raisedSymbolPlain.corkscrew')
  return ''
}

export function raisedTypeTitle(type, t) {
  if (type === 'popcorn') return t('toolbar.addCrochet.moreWizard.raised.popcorn')
  if (type === 'puff') return t('toolbar.addCrochet.moreWizard.raised.puff')
  if (type === 'bobble') return t('toolbar.addCrochet.moreWizard.raised.bobble')
  if (type === 'corkscrew') return t('toolbar.addCrochet.moreWizard.raised.corkscrew')
  return ''
}

export function buildCorkscrewRaisedSubmit(t) {
  const symbol = raisedPlainSymbol('corkscrew', t) || raisedSymbolPrefix('corkscrew', t)
  const textZh = t('toolbar.addCrochet.moreWizard.raised.corkscrew')
  return {
    kind: 'raised',
    raisedType: 'corkscrew',
    name: textZh,
    symbol_jp: symbol,
    text_zh: textZh,
    description: '',
    consume: 1,
    generate: 1
  }
}

export function buildRaisedDetailsSubmit({ raisedType, count, baseStitch }, t) {
  const typeName = raisedTypeTitle(raisedType, t) || t('toolbar.addCrochet.moreWizard.options.raised')
  const safeCount = Math.max(2, Math.min(7, Number(count) || 2))
  const base = ['X', 'T', 'F', 'E'].includes(String(baseStitch)) ? String(baseStitch) : 'F'
  const baseLabel = t(toBaseLabelKey(base))
  const prefix = raisedSymbolPrefix(String(raisedType), t)
  const symbolJp = prefix ? `${prefix}(${safeCount}${base})` : `${safeCount}${base}`
  const textZh = `${typeName}(${safeCount}{${baseLabel}})`

  return {
    kind: 'raised',
    raisedType: String(raisedType),
    count: safeCount,
    base,
    name: `${typeName} (${safeCount}${base})`,
    symbol_jp: symbolJp,
    text_zh: textZh,
    description: baseLabel,
    consume: 1,
    generate: 1
  }
}
