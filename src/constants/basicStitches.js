// Built-in stitch table: plain data only (no i18n), so Node scripts and pure utils can
// import it. Labels come from `nameKey` via i18n elsewhere. Re-exported by crochetData.js.
export const BasicStitch = [
  {
    index: 0,
    nameKey: 'crochet.stitches.slipStitch',
    // 日式縮寫：引抜（引き抜き編み）
    symbol_jp: 'sl',
    // UK pattern abbreviation
    symbol_uk: 'ss',
    consume: 1,
    generate: 1
  },
  {
    index: 1,
    nameKey: 'crochet.stitches.chain',
    // 日式縮寫：鎖（鎖編み）
    symbol_jp: 'ch',
    symbol_uk: 'ch',
    consume: 0,
    generate: 1
  },
  {
    index: 2,
    nameKey: 'crochet.stitches.turningChain',
    symbol_jp: '^',
    symbol_uk: '^',
    consume: 0,
    generate: 0
  },
  {
    index: 3,
    nameKey: 'crochet.stitches.skip',
    // 日式縮寫：休（休み目）
    symbol_jp: 'skip',
    symbol_uk: 'sk',
    consume: 1,
    generate: 0
  },
  {
    index: 4,
    nameKey: 'crochet.stitches.singleCrochet',
    symbol_jp: 'X',
    // UK: US single crochet == UK double crochet
    symbol_uk: 'dc',
    consume: 1,
    generate: 1
  },
  {
    index: 5,
    nameKey: 'crochet.stitches.increase.singleCrochet',
    symbol_jp: 'V',
    symbol_uk: '2dc',
    consume: 1,
    generate: 2
  },
  {
    index: 6,
    nameKey: 'crochet.stitches.decrease.singleCrochet',
    symbol_jp: 'A',
    symbol_uk: 'dc2tog',
    consume: 2,
    generate: 1
  },
  {
    index: 7,
    nameKey: 'crochet.stitches.halfDoubleCrochet',
    symbol_jp: 'T',
    // UK: US half double crochet == UK half treble
    symbol_uk: 'htr',
    consume: 1,
    generate: 1
  },
  {
    index: 8,
    nameKey: 'crochet.stitches.increase.halfDoubleCrochet',
    symbol_jp: 'TV',
    symbol_uk: '2htr',
    consume: 1,
    generate: 2
  },
  {
    index: 9,
    nameKey: 'crochet.stitches.decrease.halfDoubleCrochet',
    symbol_jp: 'TA',
    symbol_uk: 'htr2tog',
    consume: 2,
    generate: 1
  },
  {
    index: 10,
    nameKey: 'crochet.stitches.doubleCrochet',
    symbol_jp: 'F',
    // UK: US double crochet == UK treble
    symbol_uk: 'tr',
    consume: 1,
    generate: 1
  },
  {
    index: 11,
    nameKey: 'crochet.stitches.increase.doubleCrochet',
    symbol_jp: 'FV',
    symbol_uk: '2tr',
    consume: 1,
    generate: 2
  },
  {
    index: 12,
    nameKey: 'crochet.stitches.decrease.doubleCrochet',
    symbol_jp: 'FA',
    symbol_uk: 'tr2tog',
    consume: 2,
    generate: 1
  },
  {
    index: 13,
    nameKey: 'crochet.stitches.trebleCrochet',
    symbol_jp: 'E',
    // UK: US treble crochet == UK double treble
    symbol_uk: 'dtr',
    consume: 1,
    generate: 1
  },
  {
    index: 14,
    nameKey: 'crochet.stitches.increase.trebleCrochet',
    symbol_jp: 'EV',
    symbol_uk: '2dtr',
    consume: 1,
    generate: 2
  },
  {
    index: 15,
    nameKey: 'crochet.stitches.decrease.trebleCrochet',
    symbol_jp: 'EA',
    symbol_uk: 'dtr2tog',
    consume: 2,
    generate: 1
  },
  {
    index: 16,
    nameKey: 'crochet.stitches.tripleSpiralDoubleCrochet',
    symbol_jp: '3F',
    // Common UK equivalent for a 3-yarn-over tall stitch.
    symbol_uk: 'ttr',
    consume: 1,
    generate: 1
  },
  {
    index: 17,
    nameKey: 'crochet.stitches.increase.tripleSpiralDoubleCrochet',
    symbol_jp: '3FV',
    symbol_uk: '2ttr',
    consume: 1,
    generate: 2
  },
  {
    index: 18,
    nameKey: 'crochet.stitches.decrease.tripleSpiralDoubleCrochet',
    symbol_jp: '3FA',
    symbol_uk: 'ttr2tog',
    consume: 2,
    generate: 1
  }
]
