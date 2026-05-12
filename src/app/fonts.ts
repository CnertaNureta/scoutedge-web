import localFont from 'next/font/local'

export const epilogue = localFont({
  src: [
    { path: '../../public/fonts/epilogue-400.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/epilogue-500.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/epilogue-600.woff2', weight: '600', style: 'normal' },
    { path: '../../public/fonts/epilogue-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-headline',
  display: 'swap',
  fallback: ['Arial', 'Helvetica', 'sans-serif'],
})

export const manrope = localFont({
  src: [
    { path: '../../public/fonts/manrope-400.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/manrope-500.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/manrope-600.woff2', weight: '600', style: 'normal' },
    { path: '../../public/fonts/manrope-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-body',
  display: 'swap',
  fallback: ['Arial', 'Helvetica', 'sans-serif'],
})

export const plusJakartaSans = localFont({
  src: [
    { path: '../../public/fonts/plus-jakarta-sans-400.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/plus-jakarta-sans-500.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/plus-jakarta-sans-600.woff2', weight: '600', style: 'normal' },
    { path: '../../public/fonts/plus-jakarta-sans-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-label',
  display: 'swap',
  fallback: ['Arial', 'Helvetica', 'sans-serif'],
})

export const jetbrainsMono = localFont({
  src: [
    { path: '../../public/fonts/jetbrains-mono-400.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/jetbrains-mono-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-mono',
  display: 'swap',
  fallback: ['SFMono-Regular', 'Consolas', 'monospace'],
})

export const oswald = localFont({
  src: [
    { path: '../../public/fonts/oswald-400.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/oswald-500.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/oswald-600.woff2', weight: '600', style: 'normal' },
    { path: '../../public/fonts/oswald-700.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-condensed',
  display: 'swap',
  fallback: ['Arial Narrow', 'Arial', 'sans-serif'],
})

export const bebasNeue = localFont({
  src: [{ path: '../../public/fonts/bebas-neue-400.woff2', weight: '400', style: 'normal' }],
  variable: '--font-display',
  display: 'swap',
  fallback: ['Impact', 'Arial Narrow', 'sans-serif'],
})
