import { definePrintStyle } from '@/constants/recordPrintStyles/definePrintStyle'

export default definePrintStyle({
  id: 'classic',
  titleKey: 'recordPrint.styles.classic',
  architecture: 'healing',
  swatchColors: ['#fffbeb', '#fef3c7', '#d97706'],
  tokens: {
    domain: { bg: '#fffbeb' },
    card: {
      bg: '#fef3c7',
      border: 'rgba(146, 64, 14, 0.88)',
      shadow: '0 0.75rem 1.5rem rgba(120, 53, 15, 0.14)',
      innerBorder: '0.09375rem dashed rgba(180, 83, 9, 0.45)',
      topRadius: '0.75rem',
      restRadius: '12px'
    },
    chart: {
      ringTrack: 'rgba(146, 64, 14, 0.16)',
      ringLight: '#fde68a',
      ringDark: '#b45309',
      barFill: '#f59e0b',
      barTrack: 'rgba(180, 83, 9, 0.2)'
    },
    typography: {
      title: '#78350f',
      completed: '#92400e',
      summary: '#92400e',
      summaryHighlight: '#b45309',
      resultTitle: '#78350f',
      badgeTitle: '#78350f',
      badgeSub: 'rgba(120, 53, 15, 0.6)',
      restTitle: '#78350f',
      restSub: '#92400e',
      barLabel: 'rgba(120, 53, 15, 0.88)',
      note: '#451a03'
    },
    badge: { circleBg: 'radial-gradient(circle at 30% 30%, #fef3c7, #fbbf24)' }
  }
})
