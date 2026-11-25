import { definePrintStyle } from '@/constants/recordPrintStyles/definePrintStyle'

export default definePrintStyle({
  id: 'ocean',
  titleKey: 'recordPrint.styles.ocean',
  architecture: 'ocean',
  swatchColors: ['#bae6fd', '#38bdf8', '#0284c7'],
  tokens: {
    domain: { bg: '#bae6fd' },
    card: {
      bg: '#e0f2fe',
      border: 'rgba(2, 132, 199, 0.85)',
      shadow: '0 0.7rem 1.5rem rgba(12, 74, 110, 0.12)',
      innerBorder: '0.09375rem dashed rgba(14, 165, 233, 0.45)',
      topRadius: '1.25rem',
      restRadius: '1rem'
    },
    chart: {
      ringTrack: 'rgba(2, 132, 199, 0.18)',
      ringLight: '#7dd3fc',
      ringDark: '#0369a1',
      barFill: '#0ea5e9',
      barTrack: 'rgba(3, 105, 161, 0.2)'
    },
    typography: {
      title: '#0c4a6e',
      completed: '#0369a1',
      summary: '#0369a1',
      summaryHighlight: '#0284c7',
      resultTitle: '#0c4a6e',
      badgeTitle: '#0c4a6e',
      badgeSub: 'rgba(12, 74, 110, 0.58)',
      restTitle: '#0c4a6e',
      restSub: '#0369a1',
      barLabel: 'rgba(7, 89, 133, 0.9)',
      note: '#0c4a6e'
    },
    badge: { circleBg: 'linear-gradient(160deg, #e0f2fe 0%, #7dd3fc 100%)' }
  }
})
