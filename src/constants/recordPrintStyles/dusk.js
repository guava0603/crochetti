import { definePrintStyle } from '@/constants/recordPrintStyles/definePrintStyle'

export default definePrintStyle({
  id: 'dusk',
  titleKey: 'recordPrint.styles.dusk',
  architecture: 'dusk',
  swatchColors: ['#1e1b4b', '#312e81', '#c4b5fd'],
  tokens: {
    domain: { bg: '#1e1b4b' },
    card: {
      bg: '#312e81',
      border: 'rgba(167, 139, 250, 0.75)',
      shadow: '0 0.75rem 1.6rem rgba(0, 0, 0, 0.35)',
      innerBorder: '0.09375rem dashed rgba(233, 213, 255, 0.35)',
      topRadius: '1rem',
      restRadius: '14px'
    },
    chart: {
      ringTrack: 'rgba(196, 181, 253, 0.25)',
      ringLight: '#f9a8d4',
      ringDark: '#a78bfa',
      barFill: '#c084fc',
      barTrack: 'rgba(196, 181, 253, 0.22)'
    },
    typography: {
      title: '#e9d5ff',
      completed: '#c4b5fd',
      summary: '#ddd6fe',
      summaryHighlight: '#f9a8d4',
      resultTitle: '#e9d5ff',
      badgeTitle: '#f5f3ff',
      badgeSub: 'rgba(233, 213, 255, 0.72)',
      restTitle: '#f5f3ff',
      restSub: '#c4b5fd',
      barLabel: 'rgba(237, 233, 254, 0.92)',
      note: '#f5f3ff'
    },
    badge: { circleBg: 'linear-gradient(145deg, #4c1d95, #7c3aed)' }
  }
})
