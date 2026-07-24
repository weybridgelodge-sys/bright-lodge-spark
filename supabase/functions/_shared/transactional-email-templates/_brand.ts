// Shared brand assets for Weybridge Lodge transactional email templates.
// Use absolute URLs so email clients can fetch the image.
export const LOGO_URL =
  'https://bright-lodge-spark.lovable.app/__l5e/assets-v1/7caf0014-2e5c-4614-8622-ee60d204fdcc/weybridge-logo-navy-transparent.png'

export const LOGO_WIDTH = 120
export const LOGO_HEIGHT = 120

// Shared brand palette + typography constants so every branded email
// (React Email templates AND raw-HTML edge-function emails) stays visually
// consistent. Change here to change everywhere.
export const BRAND = {
  navy: '#1B2A4A',
  gold: '#C9A432',
  body: '#2a2a2a',
  muted: '#666',
  hairline: '#e8e3d3',
  panel: '#fafaf7',
  bg: '#ffffff',
  fontStack: 'Arial, sans-serif',
  containerMaxWidth: '600px',
} as const

// React Email inline-style objects (used by .tsx templates).
export const brandStyles = {
  main: { backgroundColor: BRAND.bg, fontFamily: BRAND.fontStack, margin: 0, padding: 0 } as const,
  container: { maxWidth: BRAND.containerMaxWidth, margin: '0 auto', padding: '24px' } as const,
  crestWrap: { textAlign: 'center' as const, padding: '8px 0 16px' },
  brand: { color: BRAND.navy, fontSize: '24px', margin: '12px 0 0', letterSpacing: '0.5px' } as const,
  brandSub: {
    color: BRAND.gold,
    fontSize: '12px',
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
    margin: '4px 0 12px',
  },
  h1: { color: BRAND.navy, fontSize: '22px', margin: '0 0 6px' } as const,
  meta: { color: '#888', fontSize: '12px', margin: '0 0 18px' } as const,
  body: { color: BRAND.body, fontSize: '14px', lineHeight: '1.55', margin: '0 0 14px' } as const,
  card: {
    backgroundColor: BRAND.panel,
    border: `1px solid ${BRAND.hairline}`,
    borderRadius: '4px',
    padding: '8px 16px',
  } as const,
  link: { color: BRAND.gold, textDecoration: 'underline', fontWeight: 600 as const } as const,
  hr: { borderColor: BRAND.hairline, margin: '20px 0 10px' } as const,
  footerText: { color: BRAND.muted, fontSize: '13px', margin: '18px 0 0' } as const,
}
