import { definePrintStyle } from '@/constants/recordPrintStyles/definePrintStyle'

export default definePrintStyle({
  id: 'standard',
  titleKey: 'recordPrint.styles.standard',
  architecture: 'healing',
  swatchColors: ['#ffffff', '#f5ebda', '#a3b666'],
  tokens: {
    domain: { bg: '#ffffff' },
    card: {
      bg: '#f5ebda',
      border: 'rgba(122, 90, 58, 0.85)',
      shadow: '0 0.75rem 1.625rem rgba(0, 0, 0, 0.1)',
      innerBorder: '0.09375rem dashed rgba(122, 90, 58, 0.38)',
      topRadius: '1rem',
      restRadius: '14px'
    },
    chart: {
      ringTrack: 'rgba(122, 90, 58, 0.14)',
      ringLight: '#ECC466',
      ringDark: '#A3B666',
      barFill: '#e09d7f',
      barTrack: 'rgba(122, 90, 58, 0.16)'
    },
    typography: {
      title: '#111827',
      completed: '#6b7280',
      summary: '#6b7280',
      summaryHighlight: '#7a5a3a',
      resultTitle: '#111827',
      badgeTitle: '#111827',
      badgeSub: 'rgba(17, 24, 39, 0.55)',
      restTitle: '#111827',
      restSub: '#6b7280',
      barLabel: 'rgba(17, 24, 39, 0.82)',
      note: '#111827'
    },
    badge: { circleBg: '#ffffff' }
  }
})
