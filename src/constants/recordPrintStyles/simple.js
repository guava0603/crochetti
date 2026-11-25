import { definePrintStyle } from '@/constants/recordPrintStyles/definePrintStyle'

export default definePrintStyle({
  id: 'simple',
  titleKey: 'recordPrint.styles.simple',
  architecture: 'simple',
  swatchColors: ['#f9fafb', '#ffffff', '#9ca3af'],
  tokens: {
    domain: { bg: '#f9fafb' },
    card: {
      bg: '#ffffff',
      border: 'rgba(209, 213, 219, 1)',
      shadow: '0 0.2rem 0.6rem rgba(17, 24, 39, 0.05)',
      innerBorder: 'none',
      topRadius: '0.5rem',
      restRadius: '0.5rem'
    },
    chart: {
      ringTrack: 'rgba(156, 163, 175, 0.35)',
      ringLight: '#e5e7eb',
      ringDark: '#6b7280',
      barFill: '#9ca3af',
      barTrack: 'rgba(209, 213, 219, 0.9)'
    },
    typography: {
      title: '#111827',
      completed: '#6b7280',
      summary: '#6b7280',
      summaryHighlight: '#374151',
      resultTitle: '#111827',
      badgeTitle: '#111827',
      badgeSub: 'rgba(55, 65, 81, 0.65)',
      restTitle: '#111827',
      restSub: '#6b7280',
      barLabel: 'rgba(55, 65, 81, 0.88)',
      note: '#374151'
    },
    badge: { circleBg: '#f3f4f6' }
  }
})
