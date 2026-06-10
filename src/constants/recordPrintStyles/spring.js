import { definePrintStyle } from '@/constants/recordPrintStyles/definePrintStyle'

export default definePrintStyle({
  id: 'spring',
  titleKey: 'recordPrint.styles.spring',
  architecture: 'spring',
  swatchColors: ['#fffdf7', '#f0fdf4', '#4ade80'],
  tokens: {
    domain: { bg: '#fffdf7' },
    card: {
      bg: '#f0fdf4',
      border: 'rgba(74, 222, 128, 0.85)',
      shadow: '0 0.65rem 1.4rem rgba(22, 101, 52, 0.12)',
      innerBorder: '0.09375rem dashed rgba(236, 72, 153, 0.4)',
      topRadius: '1.35rem',
      restRadius: '1.125rem'
    },
    chart: {
      ringTrack: 'rgba(236, 72, 153, 0.18)',
      ringLight: '#fbcfe8',
      ringDark: '#22c55e',
      barFill: '#4ade80',
      barTrack: 'rgba(34, 197, 94, 0.2)'
    },
    typography: {
      title: '#166534',
      completed: '#4d7c0f',
      summary: '#3f6212',
      summaryHighlight: '#db2777',
      resultTitle: '#14532d',
      badgeTitle: '#14532d',
      badgeSub: 'rgba(20, 83, 45, 0.6)',
      restTitle: '#166534',
      restSub: '#4d7c0f',
      barLabel: 'rgba(21, 128, 61, 0.9)',
      note: '#14532d'
    },
    badge: { circleBg: 'linear-gradient(145deg, #fce7f3 0%, #bbf7d0 55%, #fef9c3 100%)' }
  }
})
