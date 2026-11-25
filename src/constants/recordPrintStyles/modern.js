import { definePrintStyle } from '@/constants/recordPrintStyles/definePrintStyle'

export default definePrintStyle({
  id: 'modern',
  titleKey: 'recordPrint.styles.modern',
  architecture: 'modern',
  swatchColors: ['#f3f4f6', '#ffffff', '#3b82f6'],
  tokens: {
    domain: { bg: '#f3f4f6' },
    card: {
      bg: '#ffffff',
      border: 'rgba(17, 24, 39, 0.92)',
      shadow: '0 0.5rem 1.25rem rgba(17, 24, 39, 0.14)',
      innerBorder: '0.09375rem solid rgba(17, 24, 39, 0.1)',
      topRadius: '0.25rem',
      restRadius: '0.25rem'
    },
    chart: {
      ringTrack: 'rgba(17, 24, 39, 0.1)',
      ringLight: '#93c5fd',
      ringDark: '#1d4ed8',
      barFill: '#3b82f6',
      barTrack: 'rgba(17, 24, 39, 0.12)'
    },
    typography: {
      title: '#111827',
      completed: '#6b7280',
      summary: '#4b5563',
      summaryHighlight: '#1d4ed8',
      resultTitle: '#111827',
      badgeTitle: '#111827',
      badgeSub: 'rgba(17, 24, 39, 0.5)',
      restTitle: '#111827',
      restSub: '#6b7280',
      barLabel: 'rgba(17, 24, 39, 0.88)',
      note: '#111827'
    },
    badge: { circleBg: '#f9fafb' }
  }
})
