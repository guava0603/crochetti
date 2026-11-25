import { definePrintStyle } from '@/constants/recordPrintStyles/definePrintStyle'

export const SPRING_WATERCOLOR_BG = 'linear-gradient(135deg, #fff3f3 0%, #f4faf6 50%, #fffcf0 100%)'

export default definePrintStyle({
  id: 'spring',
  titleKey: 'recordPrint.styles.spring',
  architecture: 'spring',
  swatchColors: ['#fff3f3', '#f4faf6', '#8cb972'],
  tokens: {
    domain: { bg: SPRING_WATERCOLOR_BG, bgFlat: '#f4faf6' },
    card: {
      bg: 'rgba(255, 255, 255, 0.65)',
      border: '#c2dac7',
      shadow: '0 16px 45px rgba(130, 155, 138, 0.2)',
      innerBorder: '1px dashed #c2dac7',
      topRadius: '1.5rem',
      restRadius: '1.125rem'
    },
    chart: {
      ringTrack: 'rgba(230, 240, 233, 0.7)',
      ringLight: '#c3da99',
      ringDark: '#8cb972',
      barFill: 'linear-gradient(90deg, #c3da99 0%, #8cb972 100%)',
      barTrack: 'rgba(230, 240, 233, 0.7)'
    },
    typography: {
      title: '#2f3e34',
      completed: '#a0baa9',
      summary: '#7fa08c',
      summaryHighlight: '#df9877',
      resultTitle: '#556c5c',
      badgeTitle: '#233328',
      badgeSub: '#6e8576',
      restTitle: '#2f3e34',
      restSub: '#6e8576',
      barLabel: '#3b4d42',
      note: '#2f3e34'
    },
    badge: { circleBg: SPRING_WATERCOLOR_BG }
  }
})
