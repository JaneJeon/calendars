import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react'

const config = defineConfig({
  cssVarsRoot: ':where(:root, :host)',
  globalCss: {
    'html, body, #root': {
      minHeight: '100%',
      bg: 'calendar.canvas'
    },
    body: { margin: 0 }
  },
  theme: {
    tokens: {
      fonts: {
        body: {
          value:
            "Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        },
        heading: {
          value:
            "Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        }
      },
      sizes: {
        touchTarget: { value: '44px' }
      },
      colors: {
        civic: {
          canvas: { value: '#0E1621' },
          surface: { value: '#141F2C' },
          inset: { value: '#101A25' },
          raised: { value: '#1B2938' },
          text: { value: '#F3F6FA' },
          muted: { value: '#AEBAC8' },
          subtle: { value: '#8594A5' },
          border: { value: '#2C3C4E' },
          controlBorder: { value: '#5B7690' },
          focus: { value: '#91B8FF' },
          link: { value: '#B9CEFF' },
          danger: { value: '#FFB4AE' }
        },
        action: {
          50: { value: '#EFF4FF' },
          100: { value: '#E1EAFF' },
          200: { value: '#C8D8FF' },
          300: { value: '#A9C2FA' },
          400: { value: '#779CE2' },
          500: { value: '#4A73BA' },
          600: { value: '#416AAE' },
          700: { value: '#34578F' },
          800: { value: '#27446F' },
          900: { value: '#1C3150' },
          950: { value: '#14243B' }
        },
        community: {
          bg: { value: '#17372F' },
          title: { value: '#D7F5EC' },
          meta: { value: '#A9D8CA' },
          marker: { value: '#63D4B4' }
        },
        market: {
          bg: { value: '#392B18' },
          title: { value: '#FFF0CF' },
          meta: { value: '#E7C98D' },
          marker: { value: '#F1B75A' }
        },
        music: {
          bg: { value: '#3B2427' },
          title: { value: '#FFE2DF' },
          meta: { value: '#E8B1AA' },
          marker: { value: '#EF8F84' }
        },
        arts: {
          bg: { value: '#2D2943' },
          title: { value: '#F0EAFF' },
          meta: { value: '#C9BAEB' },
          marker: { value: '#B8A0F4' }
        }
      }
    },
    semanticTokens: {
      colors: {
        calendar: {
          canvas: { value: '{colors.civic.canvas}' },
          surface: { value: '{colors.civic.surface}' },
          inset: { value: '{colors.civic.inset}' },
          raised: { value: '{colors.civic.raised}' },
          text: { value: '{colors.civic.text}' },
          muted: { value: '{colors.civic.muted}' },
          subtle: { value: '{colors.civic.subtle}' },
          border: { value: '{colors.civic.border}' },
          controlBorder: { value: '{colors.civic.controlBorder}' },
          focus: { value: '{colors.civic.focus}' },
          link: { value: '{colors.civic.link}' },
          danger: { value: '{colors.civic.danger}' }
        },
        action: {
          solid: { value: '{colors.action.600}' },
          contrast: { value: 'white' },
          fg: { value: '{colors.action.200}' },
          muted: { value: '{colors.action.950}' },
          subtle: { value: '{colors.action.900}' },
          emphasized: { value: '{colors.action.800}' },
          focusRing: { value: '{colors.civic.focus}' }
        }
      }
    }
  }
})

export const system = createSystem(defaultConfig, config)

export const focusRing = {
  outline: '2px solid',
  outlineColor: 'calendar.focus',
  outlineOffset: '2px'
} as const

export const controlProps = {
  minH: 'touchTarget',
  borderWidth: '1px',
  borderColor: 'calendar.controlBorder',
  borderRadius: '10px',
  bg: 'calendar.inset',
  color: 'calendar.text',
  fontSize: '13px',
  fontWeight: '500',
  _hover: { bg: 'calendar.raised' },
  _focusVisible: focusRing
} as const

export const menuContentProps = {
  minW: '280px',
  p: '6px',
  borderWidth: '1px',
  borderColor: 'calendar.controlBorder',
  borderRadius: '12px',
  bg: 'calendar.raised',
  color: 'calendar.text',
  boxShadow: '0 18px 54px rgba(0, 0, 0, .38)',
  zIndex: 80
} as const

export const menuItemProps = {
  minH: 'touchTarget',
  px: '11px',
  py: '9px',
  borderRadius: '8px',
  color: 'calendar.text',
  fontSize: '13px',
  cursor: 'pointer',
  _highlighted: { bg: 'action.subtle', color: '#E8F0FF' },
  _focusVisible: focusRing
} as const

export const menuOptionItemProps = {
  ...menuItemProps,
  px: undefined,
  ps: '8',
  pe: '11px'
} as const

export type EventTone = 'community' | 'market' | 'music' | 'arts'

export const eventTone = {
  community: {
    bg: 'community.bg',
    title: 'community.title',
    meta: 'community.meta',
    marker: 'community.marker'
  },
  market: {
    bg: 'market.bg',
    title: 'market.title',
    meta: 'market.meta',
    marker: 'market.marker'
  },
  music: {
    bg: 'music.bg',
    title: 'music.title',
    meta: 'music.meta',
    marker: 'music.marker'
  },
  arts: {
    bg: 'arts.bg',
    title: 'arts.title',
    meta: 'arts.meta',
    marker: 'arts.marker'
  }
} as const

export const contrastPairs = [
  ['#F3F6FA', '#0E1621', 4.5],
  ['#AEBAC8', '#0E1621', 4.5],
  ['#8594A5', '#141F2C', 4.5],
  ['#FFFFFF', '#416AAE', 4.5],
  ['#FFFFFF', '#4A73BA', 4.5],
  ['#E8F0FF', '#1C3150', 4.5],
  ['#91B8FF', '#1B2938', 3],
  ['#5B7690', '#1B2938', 3],
  ['#D7F5EC', '#17372F', 4.5],
  ['#FFF0CF', '#392B18', 4.5],
  ['#FFE2DF', '#3B2427', 4.5],
  ['#F0EAFF', '#2D2943', 4.5]
] as const
